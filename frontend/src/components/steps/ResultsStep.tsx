import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  HStack,
  Button,
  Badge,
  Spinner,
  Text,
  Box,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tooltip,
  Icon,
  useToast,
  Tag,
  TagLabel,
  TagCloseButton,
  useColorMode,
  Heading,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  List,
  ListItem,
  OrderedList,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { PRESET_DESCRIPTIONS, findVulnerabilityTypes } from '../../utils/vulnerabilityTypes.ts';
import { FiCheck, FiDownload, FiFileText, FiPlus, FiEye, FiEyeOff, FiImage, FiFile, FiHelpCircle, FiGrid, FiClock, FiSave, FiList, FiDatabase, FiTrash2, FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { analyzeVulnerability, DEFAULT_VULNERABILITY_TYPES } from '../../utils/vulnerabilityMatcher.ts';
import { exportAsPNG, exportAsPDF, copyToWordTable, exportAsExcel } from '../../utils/exportUtils.ts';
import { InfoIcon, CheckIcon } from '@chakra-ui/icons';
import { CVEData } from '../../types/cve.ts';
import { getRiskInfo, getCVSSColor } from '../../utils/cvss.ts';
import { getCVEYearAndNumber } from '../../utils/cve.ts';
import { MdDragIndicator } from 'react-icons/md';

// Define global type for the CVE cache
declare global {
  interface Window {
    osum_cve_cache?: {
      data: CVEData[];
      processed: Set<string>;
      fetching: boolean;
      fetchQueue?: Array<{ type: 'cpe' | 'cve', id: string }>;
      isFetchLocked?: boolean;
    };
  }
}

interface CVSSScore {
  version: string;
  baseScore: number;
  vectorString: string;
  parsedDate?: number;
}

interface SelectedItem {
  type: 'cpe' | 'cve';
  id: string;
  missingCvssData?: boolean;
}

interface ResultsStepProps {
  selectedItems: Array<SelectedItem>;
  cvssSettings: {
    showVectorString: boolean;
    sortBy: 'rating' | 'date';
    preferredVersion: 'v4.0' | 'v3.1' | 'v3.0' | 'v2.0';
  };
  onSettingsChange: (settings: any) => void;
  onAddMore: () => void;
  onAddHoverChange: (isHovered: boolean) => void;
  onLoadingChange: (isLoading: boolean, message: string) => void;
  showHistory?: boolean; // For controlling history panel visibility
  onHistoryChange?: (show: boolean) => void; // For updating history panel state
  showSummary?: boolean; // For controlling summary panel visibility
  onSummaryChange?: (show: boolean) => void; // For updating summary panel state
  minimalMode?: boolean; // Only show floating panels, not the full component
  isAppending?: boolean; // Whether we're currently in "Add More" mode
}

// Custom styles for table header toggles
const tableHeaderToggleStyles = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '4px',
    padding: '2px 4px',
    mr: 1
  },
  label: {
    fontSize: 'xs',
    fontWeight: 'normal',
    mr: 1
  },
  switch: {
    size: 'sm'
  }
};

export const ResultsStep: React.FC<ResultsStepProps> = ({
  selectedItems,
  onAddMore,
  onLoadingChange,
  showHistory,
  onHistoryChange,
  showSummary,
  onSummaryChange,
  minimalMode = false,
  isAppending = false
}) => {
  const { colorMode } = useColorMode();
  const [cveData, setCveData] = useState<CVEData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showVectorString, setShowVectorString] = useState(
    localStorage.getItem('show_vector_string') !== 'false' // default to true
  );
  const [showColors, setShowColors] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('rating');
  const [showDescriptionDropdowns, setShowDescriptionDropdowns] = useState(false);
  const [showSoftwareEdit, setShowSoftwareEdit] = useState(false);
  const [customDescriptions, setCustomDescriptions] = useState<{ [key: string]: string }>({});
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
  const [isExporting, setIsExporting] = useState(false);
  // Use the showHistory prop if provided, otherwise use local state
  const [showFloatingHistory, setShowFloatingHistory] = useState(false);
  const [collapsedSoftware, setCollapsedSoftware] = useState<Set<string>>(new Set());
  const [hiddenCVEs, setHiddenCVEs] = useState<Set<string>>(new Set());
  const [hiddenSoftwareCVEs, setHiddenSoftwareCVEs] = useState<Record<string, Set<string>>>({});
  const [historyEntries, setHistoryEntries] = useState<Array<{
    id: string,
    name: string,
    date: string,
    items: Array<{ type: 'cpe' | 'cve', id: string }>,
    data: CVEData[],
    customSoftwareNames?: { [cpeName: string]: string },
    descriptions?: { [key: string]: string }
  }>>([]);
  const toast = useToast();
  const processedItems = useRef<Set<string>>(new Set());
  const fetchingRef = useRef<boolean>(false);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [visibleSoftware, setVisibleSoftware] = useState<Set<string>>(
    new Set(selectedItems.map(item => item.id))
  );
  const [hiddenSoftware, setHiddenSoftware] = useState<Set<string>>(new Set());
  const [removedSoftware, setRemovedSoftware] = useState<Set<string>>(new Set());
  const [customSoftwareNames, setCustomSoftwareNames] = useState<{ [cpeName: string]: string }>({});
  
  const { isOpen: isValidationModalOpen, onOpen: onValidationModalOpen, onClose: onValidationModalClose } = useDisclosure();
  const [validationInput, setValidationInput] = useState('');
  const [needsValidation, setNeedsValidation] = useState(false);

  // Define state for summarizedData to use in minimal mode
  const [manualSummarizedData, setManualSummarizedData] = useState<Array<{
    software: string,
    displayName: string,
    cves: Array<{
      cveId: string,
      cvssScore: number,
      riskLabel: string
    }>
  }>>([]);

  const [softwareOrder, setSoftwareOrder] = useState<string[]>([]);
  const [draggedSoftware, setDraggedSoftware] = useState<string | null>(null);
  const [dragOverSoftware, setDragOverSoftware] = useState<string | null>(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isButtonsFloating, setIsButtonsFloating] = useState(false);
  // Simplify the toolbar position logic
  const [toolbarPosition, setToolbarPosition] = useState<'header' | 'floating'>('header');
  
  // Update the function that checks window size with simpler logic
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Immediately determine toolbar position based on new window width
      setToolbarPosition(window.innerWidth < 1000 ? 'floating' : 'header');
    };
    
    // Call handleResize initially to set the correct position on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Remove the separate effect for toolbarPosition and simplify isButtonsFloating logic
  useEffect(() => {
    setIsButtonsFloating(windowWidth < 900);
  }, [windowWidth]);

  useEffect(() => {
    const checkUserPreference = () => {
      const preferenceFlag = localStorage.getItem('app_usr_mdl_state');
      if (preferenceFlag === '1') {
        setNeedsValidation(true);
        onValidationModalOpen();
      }
    };
    
    // Check on initial load
    checkUserPreference();
    
    // Also listen for changes to localStorage to catch when flag is set by other components
    window.addEventListener('storage', checkUserPreference);
    
    // Custom event for direct communication between components
    window.addEventListener('security_event', checkUserPreference);
    
    return () => {
      window.removeEventListener('storage', checkUserPreference);
      window.removeEventListener('security_event', checkUserPreference);
    };
  }, [onValidationModalOpen]);
  
  // Function to detect unusual patterns in user input
  const detectSpecialPattern = (input: string): boolean => {
    // Common XSS patterns
    const specialPatterns = [
      /<script>/i,
      /javascript:/i,
      /on\w+=/i,
      /alert\(/i,
      /confirm\(/i,
      /prompt\(/i,
      /<img[^>]+onerror/i,
      /<svg[^>]*onload/i,
      /document\.cookie/i,
      /\$/i, // Simple $ check for jQuery
      
      // SSTI patterns
      /\{\{.*\}\}/,
      /\$\{.*\}/,
      /#\{.*\}/,
      /<\%.*\%>/,
      /\${.*}/,
      /\{\{.*\|.*\}\}/,
      /\{\{.*\..*\}\}/,
      
      // SQL injection simplified check
      /'--/i,
      /\/\*/i,
      /UNION SELECT/i,
      
      // Other payloads
      /<iframe/i,
      /<img/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /\.innerhtml/i,
      /\.src/i,
      /href=/i,
    ];
    
    return specialPatterns.some(pattern => pattern.test(input));
  };
  
  // Handle validation response
  const handleValidationResponse = () => {
    if (validationInput.toLowerCase() === 'im sorry') {
      localStorage.removeItem('app_usr_mdl_state');
      setNeedsValidation(false);
      onValidationModalClose();
      toast({
        title: "Apology accepted",
        description: "Your hacker skills are impressive, you've earned a special badge, but let's keep it ethical!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Not so fast",
        description: "That's not a proper apology, 1337 h4x0r!",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSoftwareNameChange = (softwareKey: string, value: string, event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLInputElement>) => {
    // Check if the input contains potential special patterns
    if (detectSpecialPattern(value)) {
      // Mark with obscure key
      localStorage.setItem('app_usr_mdl_state', '1');
      setNeedsValidation(true);
      onValidationModalOpen();
      
      // Also dispatch the custom event for consistency
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Still save the input to not raise suspicion
      setCustomSoftwareNames(prev => ({
        ...prev,
        [softwareKey]: value.trim()
      }));
      
      return;
    }
    
    // Normal case - save the custom name
    setCustomSoftwareNames(prev => ({
      ...prev,
      [softwareKey]: value.trim()
    }));

    // Close the popover programmatically by clicking its close button
    if (event) {
      // Find the closest popover content container
      const popoverContent = (event.target as HTMLElement).closest('.chakra-popover__content');
      if (popoverContent) {
        // Find the close button within this specific popover content
        const closeButton = popoverContent.querySelector('.chakra-popover__close-btn');
        if (closeButton) {
          (closeButton as HTMLButtonElement).click();
        }
      }
    } else {
      // Fallback for cases where event is not available
      setTimeout(() => {
        const closeButtons = document.querySelectorAll('.chakra-popover__close-btn');
        if (closeButtons.length) {
          (closeButtons[closeButtons.length - 1] as HTMLButtonElement).click();
        }
      }, 100);
    }
  };

  // Add effect to save showFloatingSummary preference to localStorage
  useEffect(() => {
    localStorage.setItem('show_floating_summary', showSummary?.toString() || 'true');
  }, [showSummary]);

  const formatSoftwareName = (cpeName: string, cveId?: string): React.ReactNode => {
    // Check if this is a custom CVE entry or if software edit is enabled
    if ((cpeName.startsWith('Custom CVE:') && cveId) || (showSoftwareEdit && cveId)) {
      const defaultText = cpeName.startsWith('Custom CVE:') ? 
        'Unknown' : 
        cpeName.replace('cpe:2.3:a:', '').replace(/(?::[\*])+$/, '');
      
      const softwareKey = cpeName;
      const displayText = customSoftwareNames[softwareKey] || defaultText;

      // Count instances of this software name
      const instanceCount = sortedCVEData.filter(cve => cve.software === cpeName).length;
      
      return (
        <Popover 
          placement="right" 
          closeOnBlur={false}
          onOpen={() => {
            // Highlight all instances when popover opens
            document.querySelectorAll(`[data-original-name="${cpeName}"]`).forEach(el => {
              (el as HTMLElement).style.backgroundColor = colorMode === 'dark' ? '#2D3748' : '#EBF8FF';
            });
          }}
          onClose={() => {
            // Remove highlight when popover closes
            document.querySelectorAll(`[data-original-name="${cpeName}"]`).forEach(el => {
              // Reset background
              (el as HTMLElement).style.backgroundColor = '';
            });
          }}
        >
          <PopoverTrigger>
            <Box 
              className="software-name-dropdown"
              transition="all 0.2s ease"
              p={1}
              borderRadius="md"
              position="relative"
              _hover={{
                bg: colorMode === 'dark' ? 'whiteAlpha.200' : 'blue.50',
                boxShadow: 'sm',
              }}
              cursor="pointer"
              role="group"
              data-text={displayText}
              data-original-name={cpeName}
              data-display-name={displayText}
              key={`software-${cpeName}-${customSoftwareNames[softwareKey] || 'default'}`}
            >
              <Text 
                className="software-name-text" 
                color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}
              >
                {displayText}
              </Text>
              <Box
                position="absolute"
                top={0}
                right={2}
                bg={colorMode === 'dark' ? 'blue.400' : 'blue.500'}
                color="white"
                px={1}
                py={0.5}
                borderRadius="md"
                fontSize="xs"
                opacity={0}
                transform="translateX(5px)"
                transition="all 0.2s ease"
                _groupHover={{
                  opacity: 1,
                  transform: "translateX(0)"
                }}
                className="edit-icon"
                data-export="hide"
                aria-hidden="true"
              >
                ✎
              </Box>
            </Box>
          </PopoverTrigger>
          <PopoverContent width="300px">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody p={4}>
              <VStack spacing={3}>
                <Text fontSize="sm" fontWeight="medium">Edit Software Name</Text>
                <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                  This will update {instanceCount} {instanceCount === 1 ? 'instance' : 'instances'}
                </Text>
                <InputGroup size="md">
                  <Input
                    defaultValue={customSoftwareNames[softwareKey] || defaultText}
                    placeholder="Enter software name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value;
                        if (value.trim()) {
                          handleSoftwareNameChange(softwareKey, value, e);
                        }
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Save software name"
                      icon={<CheckIcon />}
                      size="sm"
                      colorScheme="green"
                      variant="ghost"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement)
                          .closest('.chakra-popover__body')
                          ?.querySelector('input') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          handleSoftwareNameChange(softwareKey, input.value, e);
                        }
                        input?.blur();
                      }}
                    />
                  </InputRightElement>
                </InputGroup>
                {customSoftwareNames[softwareKey] && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    width="full"
                    onClick={(e) => {
                      setCustomSoftwareNames(prev => {
                        const newState = {...prev};
                        delete newState[softwareKey];
                        return newState;
                      });
                      
                      // Close the popover programmatically
                      const popoverContent = (e.target as HTMLElement).closest('.chakra-popover__content');
                      if (popoverContent) {
                        // Find the close button within this specific popover content
                        const closeButton = popoverContent.querySelector('.chakra-popover__close-btn');
                        if (closeButton) {
                          (closeButton as HTMLButtonElement).click();
                        }
                      }
                    }}
                  >
                    Reset to default
                  </Button>
                )}
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      );
    }
    
    // Handle regular CPE names as before when edit mode is off
    // Use our memoized function for consistent formatting
    return getFormattedSoftwareNameFn(cpeName);
  };

  const handleAddMoreClick = () => {
    const searchStep = document.querySelector('[data-step="search"]');
    if (searchStep) {
      searchStep.closest('div')?.classList.add('highlight');
    }
    onAddMore();
  };

  // Create a global store for caching CVE data across instances
  useEffect(() => {
    // Initialize global cache if it doesn't exist
    if (!window.osum_cve_cache) {
      window.osum_cve_cache = {
        data: [],
        processed: new Set(),
        fetching: false,
        fetchQueue: [],
        isFetchLocked: false
      };
    }
    
    // Sync with global cache on mount
    if (window.osum_cve_cache.data.length > 0 && cveData.length === 0) {
      setCveData(window.osum_cve_cache.data);
      processedItems.current = new Set(window.osum_cve_cache.processed);
    }
  }, []);

  // Helper function to acquire a global fetch lock
  const acquireFetchLock = () => {
    if (window.osum_cve_cache?.isFetchLocked) {
      return false;
    }
    if (window.osum_cve_cache) {
      window.osum_cve_cache.isFetchLocked = true;
    }
    return true;
  };

  // Helper function to release the global fetch lock
  const releaseFetchLock = () => {
    if (window.osum_cve_cache) {
      window.osum_cve_cache.isFetchLocked = false;
    }
  };

  useEffect(() => {
    // Don't even try to fetch if we're in minimal mode
    if (minimalMode) {
      return;
    }

    // Skip if we're already fetching
    if (fetchingRef.current || window.osum_cve_cache?.fetching) {
      return;
    }

    // Make the entire "should we fetch" check and fetch operation atomic
    const attemptFetch = async () => {
      // Try to acquire the lock first - before checking anything else
      if (!acquireFetchLock()) {
        return; // Another instance is already handling fetching
      }

      try {
        // Now that we have the lock, check if we actually need to fetch anything
        // This entire block is now atomic because we're holding the lock
        if (fetchingRef.current || window.osum_cve_cache?.fetching) {
          return; // Safety check
        }

        // Get a snapshot of the global processed set
        const processed = window.osum_cve_cache?.processed || processedItems.current;
        
        // Find items we need to fetch (hold lock while checking to avoid race conditions)
        const newItems = selectedItems.filter(item => 
          !processed.has(JSON.stringify(item))
        );
        
        // If nothing to fetch, return early
        if (newItems.length === 0) {
          return;
        }

        // Set fetching flags
        fetchingRef.current = true;
        if (window.osum_cve_cache) {
          window.osum_cve_cache.fetching = true;
        }
        
        // Do the actual fetching
        onLoadingChange(true, 'Fetching vulnerabilities...');
        setLoading(true);
        
        try {
          const apiKey = localStorage.getItem('nvd_api_key');
          const preferredVersion = localStorage.getItem('preferred_cvss_version') || '3.1';
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          if (apiKey) {
            headers['apiKey'] = apiKey;
          }
          
          // Pre-mark all items as processed to prevent other instances from fetching them
          newItems.forEach(item => {
            const itemString = JSON.stringify(item);
            processedItems.current.add(itemString);
            if (window.osum_cve_cache?.processed) {
              window.osum_cve_cache.processed.add(itemString);
            }
          });
          
          // Now fetch the data
          const newData = await Promise.all(
            newItems.map(async (item) => {
              const endpoint = item.type === 'cve' 
                ? 'get_cve_by_id'
                : 'get_cves';
              const paramName = item.type === 'cve' 
                ? 'cveId'
                : 'cpeName';
              
              const response = await fetch(
                `http://localhost:5000/api/v1/${endpoint}?${paramName}=${encodeURIComponent(item.id)}&preferredVersion=${preferredVersion}`,
                { headers }
              );
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              return data;
            })
          );
          
          // Update both local and global state
          const updatedData = [...(cveData || []), ...newData.flat()];
          setCveData(updatedData);
          
          // Update global cache
          if (window.osum_cve_cache) {
            window.osum_cve_cache.data = updatedData;
            
            // Notify other instances of the update
            window.dispatchEvent(new CustomEvent('osum_cache_updated', {
              detail: { data: updatedData }
            }));
          }
        } catch (error) {
          console.error('Error fetching CVEs:', error);
          // If there was an error, we should remove the items from processed
          // so they can be retried later
          const processed = window.osum_cve_cache?.processed;
          if (processed) {
            newItems.forEach(item => {
              const itemString = JSON.stringify(item);
              processed.delete(itemString);
              processedItems.current.delete(itemString);
            });
          }
        } finally {
          setLoading(false);
          onLoadingChange(false, '');
          fetchingRef.current = false;
          if (window.osum_cve_cache) {
            window.osum_cve_cache.fetching = false;
          }
        }
      } finally {
        // Always release the lock when done
        releaseFetchLock();
      }
    };
    
    // Only attempt fetch if we have selected items
    if (selectedItems.length > 0) {
      attemptFetch();
    }
  }, [selectedItems, onLoadingChange, minimalMode]); // Removed cveData from dependencies

  // When cveData changes in global cache, sync with local state
  useEffect(() => {
    const handleCacheUpdate = (e: CustomEvent) => {
      if (e.detail?.data && Array.isArray(e.detail.data)) {
        setCveData(e.detail.data);
      }
    };

    window.addEventListener('osum_cache_updated', handleCacheUpdate as EventListener);
    return () => {
      window.removeEventListener('osum_cache_updated', handleCacheUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    setVisibleSoftware(prev => 
      new Set([...prev, ...selectedItems.map(item => item.id)])
    );
  }, [selectedItems]);

  const sortedCVEData = useMemo(() => {
    // Group CVEs by software
    const groupedData = cveData.reduce((acc, cve) => {
      if (!acc[cve.software]) {
        acc[cve.software] = [];
      }
      acc[cve.software].push(cve);
      return acc;
    }, {} as Record<string, CVEData[]>);

    // Sort within each software group
    Object.keys(groupedData).forEach(software => {
      if (sortBy === 'date') {
        groupedData[software].sort((a, b) => {
          const aCVE = getCVEYearAndNumber(a.cveId);
          const bCVE = getCVEYearAndNumber(b.cveId);
          if (aCVE.year !== bCVE.year) return bCVE.year - aCVE.year;
          return bCVE.number - aCVE.number;
        });
      } else {
        groupedData[software].sort((a, b) => b.cvssScore - a.cvssScore);
      }
    });

    // Get all software items that are not removed/hidden
    const validSoftwareItems = selectedItems
      .filter(item => !removedSoftware.has(item.id) && !hiddenSoftware.has(item.id))
      .map(item => item.type === 'cve' ? `Custom CVE: ${item.id}` : item.id);
      
    // If we have custom order, respect it
    let orderedSoftware = validSoftwareItems;
    if (softwareOrder.length > 0) {
      // Sort software items based on softwareOrder
      orderedSoftware = [...validSoftwareItems].sort((a, b) => {
        const indexA = softwareOrder.indexOf(a);
        const indexB = softwareOrder.indexOf(b);
        
        // Handle items not in the order (should be rare)
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
    }

    // Maintain software order based on orderedSoftware
    const unfilteredData = orderedSoftware.flatMap(software => groupedData[software] || []);
      
    // Filter out individual hidden CVEs
    return unfilteredData.filter(cve => !hiddenCVEs.has(cve.cveId));
  }, [cveData, sortBy, selectedItems, hiddenSoftware, removedSoftware, hiddenCVEs, softwareOrder]);

  const handleVulnerabilityClick = (cveId: string, vulnType: string) => {
    const template = PRESET_DESCRIPTIONS.find(desc => 
      desc.toLowerCase().includes(vulnType.toLowerCase())
    ) || vulnType;
    
    setCustomDescriptions({
      ...customDescriptions,
      [cveId]: template
    });
  };

  const getMatchingVulnerabilities = (description: string) => {
    return findVulnerabilityTypes(description);
  };

  const getSuggestedTypes = (description: string) => {
    const matches = findVulnerabilityTypes(description);
    return matches.map((match) => ({
      label: match,
      value: match,
      certainty: 100 // Assuming 100% certainty for simplicity
    }));
  };

  const handleDescriptionSelect = (cveId: string, newDescription: string) => {
    setDescriptions(prev => ({
      ...prev,
      [cveId]: newDescription
    }));
  };

  const renderDescription = (cve: CVEData) => (
    showDescriptionDropdowns ? (
      <Menu>
        <MenuButton 
          as={Box} 
          className="description-dropdown"
          data-cveid={cve.cveId}
          data-description={descriptions[cve.cveId] || cve.description}
          data-text={descriptions[cve.cveId] || cve.description}
          transition="all 0.2s ease"
          p={3}
          borderRadius="md"
          position="relative"
          bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'}
          _hover={{
            bg: colorMode === 'dark' ? 'whiteAlpha.200' : 'blue.50',
            boxShadow: 'sm',
          }}
          cursor="pointer"
          role="group"
        >
          <Text className="description-text" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
            {descriptions[cve.cveId] || cve.description}
          </Text>
          
          {/* Edit indicator */}
          <Box
            position="absolute"
            top={2}
            right={2}
            bg={colorMode === 'dark' ? 'blue.400' : 'blue.500'}
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            opacity={0}
            transform="translateX(10px)"
            transition="all 0.2s ease"
            _groupHover={{
              opacity: 1,
              transform: "translateX(0)"
            }}
            className="edit-icon"
            data-export="hide"
            aria-hidden="true"
          >
            Edit ✎
          </Box>

          {/* Bottom border indicator */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height="2px"
            bg={colorMode === 'dark' ? 'blue.400' : 'blue.500'}
            transform="scaleX(0)"
            transition="transform 0.2s ease"
            _groupHover={{
              transform: "scaleX(1)"
            }}
            data-export="hide"
          />
        </MenuButton>
        <MenuList 
          maxW="600px" 
          maxH="400px" 
          overflowY="auto" 
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}
        >
          <MenuItem onClick={() => handleDescriptionSelect(cve.cveId, cve.description)}>
            <Text whiteSpace="normal">{cve.description}</Text>
          </MenuItem>
          <MenuDivider />
          
          {/* Show matched vulnerability types first */}
          {analyzeVulnerability(cve.description).length > 0 && (
            <>
              <Box px={3} py={2} bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}>
                <Text 
                  fontWeight="bold" 
                  fontSize="sm"
                  color={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                >
                  Suggested Vulnerability Types
                </Text>
              </Box>
              {analyzeVulnerability(cve.description).map(({ type, certainty }) => (
                <MenuItem
                  key={`suggested-${type}`}
                  onClick={() => handleDescriptionSelect(cve.cveId, type)}
                  bg={colorMode === 'dark' ? 
                    (certainty > 85 ? 'green.800' : 'yellow.800') : 
                    (certainty > 85 ? 'green.50' : 'yellow.50')
                  }
                  _hover={{
                    bg: colorMode === 'dark' ? 
                      (certainty > 85 ? 'green.700' : 'yellow.700') : 
                      (certainty > 85 ? 'green.100' : 'yellow.100')
                  }}
                >
                  <HStack justify="space-between" width="full">
                    <HStack>
                      <Icon 
                        as={certainty > 85 ? FiCheck : FiHelpCircle}
                        color={colorMode === 'dark' ? 
                          (certainty > 85 ? 'green.300' : 'yellow.300') : 
                          (certainty > 85 ? 'green.500' : 'yellow.500')
                        } 
                      />
                      <Text color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}>
                        {type}
                      </Text>
                    </HStack>
                    <Badge 
                      bg={colorMode === 'dark' ? 
                        (certainty > 85 ? 'blue.500' : 'yellow.500') : 
                        (certainty > 85 ? 'green.100' : 'yellow.100')
                      }
                      color={colorMode === 'dark' ? 'white' : 
                        (certainty > 85 ? 'green.800' : 'yellow.800')
                      }
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                    >
                      {certainty}% match
                    </Badge>
                  </HStack>
                </MenuItem>
              ))}
              <MenuDivider />
              <Box px={3} py={2} bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}>
                <Text 
                  fontWeight="bold" 
                  fontSize="sm"
                  color={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                >
                  Other Vulnerability Types
                </Text>
              </Box>
            </>
          )}

          {/* Show remaining vulnerability types */}
          {DEFAULT_VULNERABILITY_TYPES
            .filter(type => !new Set(analyzeVulnerability(cve.description).map(m => m.type)).has(type))
            .map((vulnType) => (
              <MenuItem
                key={vulnType}
                onClick={() => handleDescriptionSelect(cve.cveId, vulnType)}
              >
                <Text>{vulnType}</Text>
              </MenuItem>
            ))}
        </MenuList>
      </Menu>
    ) : (
      <Text p={3}>{descriptions[cve.cveId] || cve.description}</Text>
    )
  );

  // Helper function to get formatted software name for exports
  const getFormattedSoftwareNameFn = useMemo(() => {
    return (cpeName: string): string => {
    // Check if user has defined a custom name for this CPE
    if (customSoftwareNames[cpeName]) {
      return customSoftwareNames[cpeName];
    }
    
    // Otherwise, provide the default formatted name
    if (cpeName.startsWith('Custom CVE:')) {
      return 'Unknown';
    } else {
      return cpeName.replace('cpe:2.3:a:', '').replace(/(?::[\*])+$/, '');
    }
  };
  }, [customSoftwareNames]);

  const simplifySoftwareName = (item: { type: 'cpe' | 'cve'; id: string }) => {
    if (item.type === 'cve') {
      return item.id; // Just return the CVE ID without any prefix
    }
    return item.id.replace(/^cpe:2\.3:[a-z]:/, '').replace(/:\*:\*:\*:\*:\*:\*:\*$/, '');
  };

  const handleExportPDF = () => {
    const tableData = sortedCVEData.map(cve => ({
      software: getFormattedSoftwareNameFn(cve.software),
      cveId: cve.cveId,
      cveUrl: `https://nvd.nist.gov/vuln/detail/${cve.cveId}`,
      description: descriptions[cve.cveId] || cve.description,
      cvssScore: `${cve.cvssScore.toFixed(1)} - ${getRiskInfo(cve.cvssScore).label}`,
      vectorString: cve.vectorString
    }));
    
    exportAsPDF(tableData, 'vulnerability-results', showVectorString);
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    
    try {
      // Ensure all software name dropdowns have accurate display names
      document.querySelectorAll('.software-name-dropdown').forEach(dropdown => {
        const originalName = dropdown.getAttribute('data-original-name') || '';
        const displayName = customSoftwareNames[originalName] || getFormattedSoftwareNameFn(originalName);
        
        // Update the data-text attribute to make sure it contains the current display name
        dropdown.setAttribute('data-text', displayName);
        dropdown.setAttribute('data-display-name', displayName);
        
        // Also update the text content of the child text element
        const textEl = dropdown.querySelector('.software-name-text');
        if (textEl) {
          textEl.textContent = displayName;
        }
      });
      
      // Give a slight delay to ensure DOM updates are processed
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      
      // Use the shared exportAsPNG function
      await exportAsPNG('vulnerability-table', 'vulnerability-results');
    } catch (error) {
      console.error('Failed to export as PNG:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PNG image. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyWordTable = async () => {
    const tableData = sortedCVEData.map(cve => ({
      software: getFormattedSoftwareNameFn(cve.software),
      cveId: cve.cveId,
      cveUrl: `https://nvd.nist.gov/vuln/detail/${cve.cveId}`,
      description: descriptions[cve.cveId] || cve.description,
      cvssScore: `${cve.cvssScore.toFixed(1)} - ${getRiskInfo(cve.cvssScore).label}`,
      vectorString: showVectorString ? cve.vectorString : undefined
    }));

    const success = await copyToWordTable(tableData);
    
    toast({
      title: success ? "Copied to clipboard" : "Failed to copy",
      description: success ? "Table can now be pasted into Word (Ctrl+V)" : "Please try again",
      status: success ? "success" : "error",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleExportExcel = () => {
    const tableData = sortedCVEData.map(cve => ({
      software: getFormattedSoftwareNameFn(cve.software),
      cveId: cve.cveId,
      cveUrl: `https://nvd.nist.gov/vuln/detail/${cve.cveId}`,
      description: descriptions[cve.cveId] || cve.description,
      cvssScore: cve.cvssScore !== null ? cve.cvssScore.toFixed(1) : 'N/A',
      vectorString: cve.vectorString || ''
    }));
    
    exportAsExcel(tableData, 'vulnerability-results');
  };

  const handleToggleDropdownDescriptions = (isChecked: boolean) => {
    // Show loading state immediately
    setLoading(true);
    onLoadingChange(true, "Processing description dropdowns...");
    
    // Use setTimeout to allow the loading state to render
    setTimeout(() => {
      setShowDescriptionDropdowns(isChecked);
      if (!isChecked) {
        // Reset descriptions to initial values
        setDescriptions({});
      }
      
      // Hide loading when complete
      setLoading(false);
      onLoadingChange(false, "");
    }, 100); // Small delay to ensure loading UI renders
  };

  // Helper function to check if this is the first row of a new software group
  const isNewSoftwareGroup = (index: number, cve: CVEData) => {
    return index === 0 || cve.software !== sortedCVEData[index - 1].software;
  };

  const toggleVisibility = (software: string) => {
    setHiddenSoftware(prev => {
      const next = new Set(prev);
      if (next.has(software)) {
        next.delete(software);
      } else {
        next.add(software);
      }
      return next;
    });
  };

  const handleTagRemove = (e: React.MouseEvent, software: string) => {
    e.stopPropagation();
    setRemovedSoftware(prev => new Set([...prev, software]));
    setHiddenSoftware(prev => new Set([...prev, software]));
  };

  // Create a grouped and summarized version of the data for the floating summary
  const summarizedData = useMemo(() => {
    // In minimal mode (but not during appending), use the manual data
    if (minimalMode && !isAppending) {
      return manualSummarizedData;
    }

    // Group CVEs by software
    const groupedData: Record<string, {
      software: string,
      displayName: string,
      cves: Array<{
        cveId: string,
        cvssScore: number,
        riskLabel: string
      }>
    }> = {};

    // Create a set of valid software IDs from selectedItems for fast lookup
    const validSoftwareIds = new Set(selectedItems
      .filter(item => !removedSoftware.has(item.id) && !hiddenSoftware.has(item.id))
      .map(item => item.type === 'cve' ? `Custom CVE: ${item.id}` : item.id));

    // Only use CVE data that belongs to currently selected items
    const currentCVEData = cveData.filter(cve => validSoftwareIds.has(cve.software));

    // Group by software
    currentCVEData.forEach(cve => {
      if (!groupedData[cve.software]) {
        // Use a local name formatting function to avoid circular dependencies
        let displayName = customSoftwareNames[cve.software] || '';
        if (!displayName) {
          displayName = cve.software.startsWith('Custom CVE:') 
            ? 'Unknown' 
            : cve.software.replace('cpe:2.3:a:', '').replace(/(?::[\*])+$/, '');
        }
        
        groupedData[cve.software] = {
          software: cve.software,
          displayName: displayName,
          cves: []
        };
      }
      
      groupedData[cve.software].cves.push({
        cveId: cve.cveId,
        cvssScore: cve.cvssScore,
        riskLabel: getRiskInfo(cve.cvssScore).label
      });
    });

    return Object.values(groupedData);
  }, [cveData, selectedItems, hiddenSoftware, removedSoftware, minimalMode, manualSummarizedData, isAppending, customSoftwareNames]);

  // Update softwareOrder when summarizedData changes
  useEffect(() => {
    // Only update the order if we don't already have an order or if new software entries are added
    if (softwareOrder.length === 0 || summarizedData.some(group => !softwareOrder.includes(group.software))) {
      // Keep existing order for items that are already in softwareOrder
      const existingItems = softwareOrder.filter(software => 
        summarizedData.some(group => group.software === software)
      );
      
      // Add new items that aren't in the order yet
      const newItems = summarizedData
        .filter(group => !softwareOrder.includes(group.software))
        .map(group => group.software);
      
      // Prevent unnecessary updates if the new order is the same
      const newOrder = [...existingItems, ...newItems];
      if (JSON.stringify(newOrder) !== JSON.stringify(softwareOrder)) {
        setSoftwareOrder(newOrder);
      }
    }
  }, [summarizedData]); // Remove softwareOrder from dependencies

  // Sort summarizedData based on softwareOrder
  const orderedSummarizedData = useMemo(() => {
    if (softwareOrder.length === 0) return summarizedData;
    
    // Create a copy of summarizedData to sort
    const sortable = [...summarizedData];
    
    // Sort by the order in softwareOrder array
    sortable.sort((a, b) => {
      const indexA = softwareOrder.indexOf(a.software);
      const indexB = softwareOrder.indexOf(b.software);
      
      // Handle items not in the order (should be rare)
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
    
    return sortable;
  }, [summarizedData, softwareOrder.join(',')]);

  const toggleSoftwareCollapse = (software: string) => {
    setCollapsedSoftware(prev => {
      const next = new Set(prev);
      if (next.has(software)) {
        next.delete(software);
      } else {
        next.add(software);
      }
      return next;
    });
  };

  const toggleCVEVisibility = (cveId: string) => {
    setHiddenCVEs(prev => {
      const next = new Set(prev);
      if (next.has(cveId)) {
        next.delete(cveId);
        toast({
          title: "CVE visible",
          description: `${cveId} is now visible in the table`,
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } else {
        next.add(cveId);
        toast({
          title: "CVE hidden",
          description: `${cveId} is now hidden from the table`,
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      }
      return next;
    });
  };

  // Add a function to toggle all CVEs
  const toggleAllCVEs = () => {
    // Get a list of all CVEs from the summarized data
    const allCVEs = summarizedData.flatMap(group => group.cves.map(cve => cve.cveId));
    
    // If any CVEs are currently hidden, show them all, otherwise hide them all
    if (hiddenCVEs.size > 0) {
      // Show all CVEs
      setHiddenCVEs(new Set());
      toast({
        title: "All CVEs visible",
        description: "All CVEs are now visible in the table",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } else {
      // Hide all CVEs
      setHiddenCVEs(new Set(allCVEs));
      toast({
        title: "All CVEs hidden",
        description: `${allCVEs.length} CVEs are now hidden from the table`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // Determine if any CVEs are currently hidden
  const hasHiddenCVEs = hiddenCVEs.size > 0;

  // Add a function to toggle all CVEs in a software group
  const toggleSoftwareCVEs = (software: string, hideAll: boolean) => {
    // Get all CVEs for this software from summarized data
    const softwareGroup = summarizedData.find(group => group.software === software);
    if (!softwareGroup) return;
    
    const softwareCVEs = softwareGroup.cves.map(cve => cve.cveId);
    
    // Check if any CVEs are currently hidden
    const hasHiddenCVEsInGroup = softwareCVEs.some(cveId => hiddenCVEs.has(cveId));
    
    setHiddenCVEs(prev => {
      const next = new Set(prev);
      
      if (hasHiddenCVEsInGroup) {
        // If any are hidden, show all (remove all from hidden set)
        softwareCVEs.forEach(cveId => next.delete(cveId));
        toast({
          title: `All ${softwareGroup.displayName} CVEs visible`,
          description: `${softwareCVEs.length} CVEs are now visible in the table`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        // If none are hidden, hide all (add all to hidden set)
        softwareCVEs.forEach(cveId => next.add(cveId));
        toast({
          title: `All ${softwareGroup.displayName} CVEs hidden`,
          description: `${softwareCVEs.length} CVEs are now hidden from the table`,
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      }
      
      return next;
    });
  };

  // Get count of hidden CVEs for a software
  const getHiddenCVECount = (software: string): number => {
    const softwareGroup = summarizedData.find(group => group.software === software);
    if (!softwareGroup) return 0;
    
    const softwareCVEs = softwareGroup.cves.map(cve => cve.cveId);
    return softwareCVEs.filter(cveId => hiddenCVEs.has(cveId)).length;
  };

  // Check if all CVEs for a software are hidden
  const areAllSoftwareCVEsHidden = (software: string): boolean => {
    const softwareGroup = summarizedData.find(group => group.software === software);
    if (!softwareGroup || softwareGroup.cves.length === 0) return false;
    
    return softwareGroup.cves.every(cve => hiddenCVEs.has(cve.cveId));
  };

  // Check if any CVEs for a software are hidden (not necessarily all)
  const hasSoftwareHiddenCVEs = (software: string): boolean => {
    const softwareGroup = summarizedData.find(group => group.software === software);
    if (!softwareGroup || softwareGroup.cves.length === 0) return false;
    
    return softwareGroup.cves.some(cve => hiddenCVEs.has(cve.cveId));
  };

  // Generate unique keys for each history entry based on timestamp and content hash
  const generateHistoryKey = (entry: {
    id: string,
    items: Array<{ type: 'cpe' | 'cve', id: string }>
  }): string => {
    // Create a unique key combining id with a hash of the item ids
    return `cve_history_${entry.id}`;
  };

  // Save history to localStorage with a unique key
  const saveHistoryToLocalStorage = (entry: {
    id: string,
    name: string,
    date: string,
    items: Array<{ type: 'cpe' | 'cve', id: string }>,
    data: CVEData[],
    customSoftwareNames?: { [cpeName: string]: string },
    descriptions?: { [key: string]: string }
  }) => {
    const key = generateHistoryKey(entry);
    localStorage.setItem(key, JSON.stringify(entry));
    
    // Update the main history index
    const historyIndex = getHistoryIndex();
    if (!historyIndex.includes(entry.id)) {
      historyIndex.unshift(entry.id); // Add to beginning of array
      localStorage.setItem('cve_cpe_history_index', JSON.stringify(historyIndex));
    }
  };

  // Get the history index array from localStorage
  const getHistoryIndex = (): string[] => {
    const indexJson = localStorage.getItem('cve_cpe_history_index');
    if (indexJson) {
      try {
        return JSON.parse(indexJson);
      } catch (error) {
        console.error('Error parsing history index:', error);
      }
    }
    return [];
  };

  // Load all history entries from localStorage
  const loadHistoryEntries = (): Array<{
    id: string,
    name: string,
    date: string,
    items: Array<{ type: 'cpe' | 'cve', id: string }>,
    data: CVEData[],
    customSoftwareNames?: { [cpeName: string]: string },
    descriptions?: { [key: string]: string }
  }> => {
    const historyIndex = getHistoryIndex();
    
    return historyIndex
      .map(id => {
        const key = `cve_history_${id}`;
        const entryJson = localStorage.getItem(key);
        if (entryJson) {
          try {
            return JSON.parse(entryJson);
          } catch (error) {
            console.error(`Error parsing history entry ${id}:`, error);
            return null;
          }
        }
        return null;
      })
      .filter(entry => entry !== null);
  };

  // Delete a history entry from localStorage
  const deleteHistoryFromLocalStorage = (id: string) => {
    // Remove the entry data
    localStorage.removeItem(`cve_history_${id}`);
    
    // Update the index
    const historyIndex = getHistoryIndex();
    const updatedIndex = historyIndex.filter(entryId => entryId !== id);
    
    if (updatedIndex.length > 0) {
      localStorage.setItem('cve_cpe_history_index', JSON.stringify(updatedIndex));
    } else {
      // If no entries left, remove the index completely
      localStorage.removeItem('cve_cpe_history_index');
    }
  };

  // Load history entries from localStorage on component mount
  useEffect(() => {
    const loadHistoryOnMount = () => {
      const entries = loadHistoryEntries();
      if (entries.length > 0) {
        setHistoryEntries(entries);
      }
    };
    
    loadHistoryOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only on mount

  // Save history to localStorage when it changes
  // We no longer need this effect since we save each entry individually

  // Save current state to history
  const saveToHistory = () => {
    if (cveData.length === 0 || selectedItems.length === 0) {
      toast({
        title: "No data to save",
        description: "There is no data to save to history",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Create a unique identifier and prepare entry data
    const timestamp = new Date();
    const id = `history_${timestamp.getTime()}`;
    
    // Generate a simple name based on software items
    const softwareNames = selectedItems
      .filter(item => !removedSoftware.has(item.id))
      .map(item => simplifySoftwareName(item))
      .slice(0, 3)
      .join(", ");
    
    const name = softwareNames + (selectedItems.length > 3 ? ` +${selectedItems.length - 3} more` : "");
    
    const newEntry = {
      id,
      name,
      date: timestamp.toLocaleString(),
      items: selectedItems.filter(item => !removedSoftware.has(item.id)),
      data: cveData,
      customSoftwareNames: {...customSoftwareNames}, // Save custom names
      descriptions: {...descriptions} // Save custom descriptions
    };

    // Save to localStorage with the new approach
    saveHistoryToLocalStorage(newEntry);
    
    // Update local state
    setHistoryEntries(prev => [newEntry, ...prev]);
    
    toast({
      title: "Saved to History",
      description: "Current data has been saved to history",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // Automatically show the history panel after saving
    handleHistoryVisibilityChange(true);
  };

  // Delete history entry
  const deleteHistoryEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    
    // Delete from localStorage using the new approach
    deleteHistoryFromLocalStorage(id);
    
    // Update local state
    const updatedEntries = historyEntries.filter(entry => entry.id !== id);
    setHistoryEntries(updatedEntries);
    
    toast({
      title: "Entry Deleted",
      description: "History entry has been removed",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // Update the history visibility when showHistory prop changes
  useEffect(() => {
    if (showHistory !== undefined) {
      // Only update if explicitly specified from parent
      // But DON'T hide history when in appending mode
      if (!(isAppending && showHistory === false)) {
        // Only update if the value is different to avoid unnecessary renders
        if (showFloatingHistory !== showHistory) {
          setShowFloatingHistory(showHistory);
        }
      }
    }
  }, [showHistory, isAppending, showFloatingHistory]);

  // Handle changes to the floating history visibility
  const handleHistoryVisibilityChange = (visible: boolean) => {
    setShowFloatingHistory(visible);
    if (onHistoryChange) {
      onHistoryChange(visible);
    }
  };

  // Add handler for summary visibility changes
  const handleSummaryVisibilityChange = (visible: boolean) => {
    if (onSummaryChange) {
      onSummaryChange(visible);
    }
  };

  // Create an empty summarizedData array when in minimal mode to avoid errors
  useEffect(() => {
    if (minimalMode && manualSummarizedData.length > 0) {
      setManualSummarizedData([]);
    }
  }, [minimalMode, manualSummarizedData.length]);

  // Update the useEffect that handles minimal mode data
  useEffect(() => {
    // In minimal mode, we need to handle summarized data appropriately
    if (minimalMode) {
      // Only load from history if we're deliberately showing results
      // and we don't have any selected items yet (such as when in append mode)
      if (selectedItems.length > 0 && cveData.length > 0) {
        try {
          // Transform the currently selected items' data into summarizedData format
          const groupedData: Record<string, {
            software: string,
            displayName: string, 
            cves: Array<{
              cveId: string,
              cvssScore: number,
              riskLabel: string
            }>
          }> = {};

          // Use the current CVE data for populating the summary
          cveData.forEach(cve => {
            if (!groupedData[cve.software]) {
              // IMPORTANT: Always use the memoized function to get formatted names
              // This ensures we respect customSoftwareNames even during "Add More"
              const displayName = getFormattedSoftwareNameFn(cve.software);
              
              groupedData[cve.software] = {
                software: cve.software,
                displayName: displayName,
                cves: []
              };
            }
            
            groupedData[cve.software].cves.push({
              cveId: cve.cveId,
              cvssScore: cve.cvssScore,
              riskLabel: getRiskInfo(cve.cvssScore).label
            });
          });

          // Only update if the data has actually changed to avoid unnecessary rerenders
          const newSummarizedData = Object.values(groupedData);
          if (JSON.stringify(newSummarizedData) !== JSON.stringify(manualSummarizedData)) {
            setManualSummarizedData(newSummarizedData);
          }
        } catch (e) {
          console.error("Error processing data for summary:", e);
          setManualSummarizedData([]);
        }
      } else if (manualSummarizedData.length > 0) {
        // No selected items or no data, clear summary only if it's not already empty
        setManualSummarizedData([]);
      }
    }
  }, [minimalMode, selectedItems, cveData, customSoftwareNames]);

  // Load data from history entry
  const loadFromHistory = (entry: {
    id: string,
    name: string,
    date: string,
    items: Array<{ type: 'cpe' | 'cve', id: string }>,
    data: CVEData[],
    customSoftwareNames?: { [cpeName: string]: string },
    descriptions?: { [key: string]: string }
  }) => {
    // Acquire lock to prevent any fetches during history loading
    const lockAcquired = acquireFetchLock();
    
    try {
      // Set a flag to prevent unnecessary refetching
      fetchingRef.current = true;
      if (window.osum_cve_cache) {
        window.osum_cve_cache.fetching = true;
      }
      
      // Reset the current state
      processedItems.current.clear();
      
      // Add all items to processedItems to prevent re-fetching
      entry.items.forEach(item => {
        processedItems.current.add(JSON.stringify(item));
        if (window.osum_cve_cache?.processed) {
          window.osum_cve_cache.processed.add(JSON.stringify(item));
        }
      });
      
      // Set the data - this should repopulate the table
      setCveData(entry.data);
      
      // Update the global cache
      if (window.osum_cve_cache) {
        window.osum_cve_cache.data = entry.data;
        
        // Notify other components that the cache was updated
        window.dispatchEvent(new CustomEvent('osum_cache_updated', {
          detail: { data: entry.data }
        }));
      }
      
      // Restore custom software names if they exist in the entry
      if (entry.customSoftwareNames) {
        setCustomSoftwareNames(entry.customSoftwareNames);
      }
      
      // Restore descriptions if they exist in the entry
      if (entry.descriptions) {
        setDescriptions(entry.descriptions);
      }
      
      // Important: We need to reset selected state to match saved items
      // Update visible software to match the loaded entries
      setVisibleSoftware(new Set(entry.items.map(item => item.id)));
      
      // Reset hidden/removed states
      setHiddenSoftware(new Set());
      setRemovedSoftware(new Set());
      setHiddenCVEs(new Set());
    } finally {
      // Lock any updates from useEffect hooks that depend on these changes
      // This is critical to prevent circular updates
      const unlockUpdates = () => {
        fetchingRef.current = false;
        if (window.osum_cve_cache) {
          window.osum_cve_cache.fetching = false;
        }
        
        // Release the lock if we acquired it
        if (lockAcquired) {
          releaseFetchLock();
        }

        toast({
          title: "History Loaded",
          description: `Loaded data from ${entry.date}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        // Close the history panel
        handleHistoryVisibilityChange(false);
      };
      
      // Dispatch an event to notify parent components that we've loaded from history
      // This is needed because selectedItems is a prop that comes from a parent component
      window.dispatchEvent(new CustomEvent('history_loaded', { 
        detail: { 
          items: entry.items 
        }
      }));
      
      // Reset the fetching flag after a delay to ensure all component updates are processed
      setTimeout(unlockUpdates, 100);
    }
  };

  // Add a function to clear all history entries
  const clearAllHistory = () => {
    // First check if there are any entries to clear
    if (historyEntries.length === 0) {
      toast({
        title: "No history entries",
        description: "There are no history entries to clear",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Get the current history index
    const historyIndex = getHistoryIndex();
    
    // Remove all individual history entries from localStorage
    historyIndex.forEach(id => {
      localStorage.removeItem(`cve_history_${id}`);
    });
    
    // Remove the history index
    localStorage.removeItem('cve_cpe_history_index');
    
    // Clear the state
    setHistoryEntries([]);
    
    toast({
      title: "History cleared",
      description: "All history entries have been removed",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Add event listener for cancel_add_more to refresh data when canceling Add More mode
  useEffect(() => {
    const handleCancelAddMore = () => {
      // Keep only CVE data that belongs to current selectedItems
      const validSoftwareIds = new Set(selectedItems.map(item => 
        item.type === 'cve' ? `Custom CVE: ${item.id}` : item.id
      ));
      
      // Filter CVE data to only include entries for currently selected items
      const filteredCVEData = cveData.filter(cve => validSoftwareIds.has(cve.software));
      
      // Reset the CVE data to only include the current items
      setCveData(filteredCVEData);
    };

    window.addEventListener('cancel_add_more', handleCancelAddMore);
    
    return () => {
      window.removeEventListener('cancel_add_more', handleCancelAddMore);
    };
  }, [selectedItems, cveData]);

  // Don't show spinner in minimal mode
  if (loading && !minimalMode) return <Spinner size="xl" />;

  // Drag and drop handlers
  const handleDragStart = (software: string) => {
    setDraggedSoftware(software);
    
    // Collapse all software groups for easier navigation
    setCollapsedSoftware(new Set(
      summarizedData.map(group => group.software)
    ));
  };

  const handleDragOver = (e: React.DragEvent, software: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSoftware !== software) {
      setDragOverSoftware(software);
    }
  };

  const handleDragEnd = () => {
    setDraggedSoftware(null);
    setDragOverSoftware(null);
  };

  const handleDrop = (e: React.DragEvent, targetSoftware: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSoftware || draggedSoftware === targetSoftware) {
      setDraggedSoftware(null);
      setDragOverSoftware(null);
      return;
    }
    
    // Create new order by moving draggedSoftware before targetSoftware
    const newOrder = [...softwareOrder];
    const draggedIndex = newOrder.indexOf(draggedSoftware);
    const targetIndex = newOrder.indexOf(targetSoftware);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove from current position
      newOrder.splice(draggedIndex, 1);
      
      // Insert at new position (before target)
      const insertAt = newOrder.indexOf(targetSoftware);
      newOrder.splice(insertAt, 0, draggedSoftware);
      
      setSoftwareOrder(newOrder);
    }
    
    setDraggedSoftware(null);
    setDragOverSoftware(null);
  };

  return (
    <VStack spacing={4} w="full">
      {/* Floating History Box */}
      {showFloatingHistory && (
        <Box
          position="fixed"
          left="20px"
          top="75px" // Increased to provide more space for the top navigation
          bottom="20px"
          width="350px"
          maxHeight="calc(100vh - 95px)" // Updated to account for new top position
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          p={0}
          borderRadius="md"
          boxShadow="lg"
          borderWidth="1px"
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          zIndex={90} // Lower than the main nav's z-index of 999
          display="flex"
          flexDirection="column"
          sx={{
            animation: 'historyAppear 0.3s ease-out forwards',
            transformOrigin: 'top left',
            '@keyframes historyAppear': {
              '0%': {
                opacity: 0,
                transform: 'scale(0.7)',
              },
              '70%': {
                opacity: 1,
                transform: 'scale(1.05)',
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
            },
          }}
        >
          {/* Fixed Header */}
          <Flex 
            justifyContent="space-between" 
            alignItems="center"
            bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'}
            borderBottom="1px"
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            px={3}
            py={2}
            borderTopRadius="md"
            position="sticky"
            top="0"
            zIndex={1}
          >
            <Flex alignItems="center" minWidth={0} flex="1">
              <Heading size="sm" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">History</Heading>
              <Badge 
                ml={2}
                colorScheme="blue"
                fontSize="xs"
                variant="subtle"
                borderRadius="full"
                px={2}
                py={0}
                whiteSpace="nowrap"
              >
                {historyEntries.length}
              </Badge>
            </Flex>
            {toolbarPosition === 'header' && (
              <HStack>
                <Tooltip label="Save current data" placement="top">
                  <IconButton
                    aria-label="Save to history"
                    icon={<FiSave />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={saveToHistory}
                  />
                </Tooltip>
                <Tooltip label="Clear all history" placement="top">
                  <IconButton
                    aria-label="Clear all history"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={clearAllHistory}
                  />
                </Tooltip>
                <Tooltip label="Close history panel" placement="top">
                  <IconButton
                    aria-label="Close history"
                    icon={<span>×</span>}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleHistoryVisibilityChange(false)}
                  />
                </Tooltip>
              </HStack>
            )}
          </Flex>
          
          {/* Center-positioned toolbar when screen is small */}
          {toolbarPosition === 'floating' && (
            <Box
              position="absolute"
              top="-15px"
              left="50%"
              transform="translateX(-50%)"
              zIndex={500}
              bg={colorMode === 'dark' ? 'gray.700' : 'white'}
              p={2}
              borderRadius="md"
              boxShadow="md"
              borderWidth="1px"
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              transition="all 0.3s ease"
            >
              <HStack spacing={2}>
                <Tooltip label="Save current data" placement="top">
                  <IconButton
                    aria-label="Save to history"
                    icon={<FiSave />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={saveToHistory}
                  />
                </Tooltip>
                <Tooltip label="Clear all history" placement="top">
                  <IconButton
                    aria-label="Clear all history"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={clearAllHistory}
                  />
                </Tooltip>
                <Tooltip label="Close history panel" placement="top">
                  <IconButton
                    aria-label="Close history"
                    icon={<span>×</span>}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleHistoryVisibilityChange(false)}
                  />
                </Tooltip>
              </HStack>
            </Box>
          )}
          
          {/* Scrollable Content */}
          <Box 
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: colorMode === 'dark' ? '#2D3748' : '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: colorMode === 'dark' ? '#4A5568' : '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: colorMode === 'dark' ? '#718096' : '#555',
              },
            }}
            px={4}
            pb={4}
            pt={2}
            flex="1"
          >
            {historyEntries.length === 0 ? (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                height="100%" 
                p={4}
                textAlign="center"
                color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
              >
                <Icon as={FiDatabase} fontSize="3xl" mb={3} />
                <Text fontSize="md">No history entries yet</Text>
                <Text fontSize="sm" mt={2}>
                  Save your current table data by clicking the save button above
                </Text>
              </Flex>
            ) : (
              historyEntries.map((entry) => (
                <Box 
                  key={entry.id} 
                  mb={4} 
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                  cursor="pointer"
                  transition="all 0.2s"
              _hover={{
                    transform: 'translateY(-2px)',
                    shadow: 'md',
                    borderColor: colorMode === 'dark' ? 'blue.500' : 'blue.300',
                  }}
                  onClick={() => loadFromHistory(entry)}
                >
                  <Flex justifyContent="space-between" alignItems="center" mb={2}>
                    <Heading size="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                      {entry.name}
                    </Heading>
                    <Tooltip label="Delete entry" placement="top">
                      <IconButton
                        aria-label="Delete entry"
                        icon={<span>×</span>}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={(e) => deleteHistoryEntry(entry.id, e)}
            />
          </Tooltip>
                  </Flex>
                  
                  <Flex mb={2}>
                    <Badge colorScheme="blue" fontSize="xs" borderRadius="full" px={2}>
                      {entry.items.length} items
                    </Badge>
                    <Badge ml={2} colorScheme="green" fontSize="xs" borderRadius="full" px={2}>
                      {entry.data.length} CVEs
                    </Badge>
                  </Flex>
                  
                  <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}>
                    {entry.date}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}

      {/* Floating Summary Box */}
      {showSummary && (minimalMode || isAppending || summarizedData.length > 0) && (
        <Box
          position="fixed"
          right="20px"
          top="75px" // Increased to provide more space for the top navigation
          bottom="20px" 
          width="350px"
          maxHeight="calc(100vh - 95px)" // Updated to account for new top position
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          p={0}
          borderRadius="md"
          boxShadow="lg"
          borderWidth="1px"
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          zIndex={90} // Lower than the main nav's z-index of 999
          display="flex"
          flexDirection="column"
          sx={{
            animation: 'summaryAppear 0.3s ease-out forwards',
            transformOrigin: 'top right',
            '@keyframes summaryAppear': {
              '0%': {
                opacity: 0,
                transform: 'scale(0.7)',
              },
              '70%': {
                opacity: 1,
                transform: 'scale(1.05)',
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
            },
          }}
        >
          {/* Fixed Header */}
          <Flex 
            justifyContent="space-between" 
            alignItems="center"
            bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'}
            borderBottom="1px"
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            px={3}
            py={2}
            borderTopRadius="md"
            position="sticky"
            top="0"
            zIndex={1}
          >
            <Flex alignItems="center" minWidth={0} flex="1">
              <Heading size="sm" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">Vulnerability Summary</Heading>
              <Badge 
                ml={2}
                colorScheme="blue"
                fontSize="xs"
                variant="subtle"
                borderRadius="full"
                px={2}
                py={0}
                whiteSpace="nowrap"
              >
                {sortedCVEData.length}
              </Badge>
            </Flex>
            {toolbarPosition === 'header' && (
              <HStack>
                <Tooltip label={hasHiddenCVEs ? "Show all CVEs" : "Hide all CVEs"} placement="top">
                  <IconButton
                    aria-label={hasHiddenCVEs ? "Show all CVEs" : "Hide all CVEs"}
                    icon={hasHiddenCVEs ? <FiEye /> : <FiEye />}
                    size="sm"
                    variant="ghost"
                    colorScheme={hasHiddenCVEs ? "red" : "green"}
                    onClick={() => toggleAllCVEs()}
                  />
                </Tooltip>
                <Tooltip label="Close summary panel" placement="top">
                  <IconButton
                    aria-label="Close summary"
                    icon={<span>×</span>}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSummaryVisibilityChange(false)}
                  />
                </Tooltip>
              </HStack>
            )}
          </Flex>
          
          {/* Center-positioned toolbar when screen is small */}
          {toolbarPosition === 'floating' && (
            <Box
              position="absolute"
              top="-15px"
              left="50%"
              transform="translateX(-50%)"
              zIndex={500}
              bg={colorMode === 'dark' ? 'gray.700' : 'white'}
              p={2}
              borderRadius="md"
              boxShadow="md"
              borderWidth="1px"
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              transition="all 0.3s ease"
            >
              <HStack spacing={2}>
                <Tooltip label={hasHiddenCVEs ? "Show all CVEs" : "Hide all CVEs"} placement="top">
                  <IconButton
                    aria-label={hasHiddenCVEs ? "Show all CVEs" : "Hide all CVEs"}
                    icon={hasHiddenCVEs ? <FiEye /> : <FiEye />}
                    size="sm"
                    variant="ghost"
                    colorScheme={hasHiddenCVEs ? "red" : "green"}
                    onClick={() => toggleAllCVEs()}
                  />
                </Tooltip>
                <Tooltip label="Close summary panel" placement="top">
                  <IconButton
                    aria-label="Close summary"
                    icon={<span>×</span>}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSummaryVisibilityChange(false)}
                  />
                </Tooltip>
              </HStack>
            </Box>
          )}
          
          {/* Scrollable Content */}
          <Box 
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: colorMode === 'dark' ? '#2D3748' : '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: colorMode === 'dark' ? '#4A5568' : '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: colorMode === 'dark' ? '#718096' : '#555',
              },
            }}
            px={4}
            pb={4}
            pt={2}
            flex="1"
          >
            {orderedSummarizedData.map((softwareGroup) => (
              <Box 
                key={softwareGroup.software} 
                mb={4} 
                pb={3} 
                borderBottom="1px" 
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
                draggable={true}
                onDragStart={() => handleDragStart(softwareGroup.software)}
                onDragOver={(e) => handleDragOver(e, softwareGroup.software)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, softwareGroup.software)}
                bg={dragOverSoftware === softwareGroup.software ? 
                  (colorMode === 'dark' ? 'blue.800' : 'blue.50') : 
                  (draggedSoftware === softwareGroup.software ?
                    (colorMode === 'dark' ? 'gray.600' : 'gray.100') :
                    'transparent')
                }
                transition="background-color 0.2s"
                borderRadius="md"
                opacity={draggedSoftware === softwareGroup.software ? 0.75 : 1}
                outline={dragOverSoftware === softwareGroup.software ? 
                  (colorMode === 'dark' ? '2px dashed blue.300' : '2px dashed blue.500') : 
                  'none'}
                position="relative"
                zIndex={draggedSoftware === softwareGroup.software ? 10 : 1}
              >
                <Box 
                  mb={2} 
                  borderBottom="1px" 
                  borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                  pb={1}
                >
                  <Flex 
                    justifyContent="space-between" 
                    alignItems="center"
                  >
                    <Flex 
                      flex="1"
                      alignItems="center" 
                      cursor="pointer"
                      onClick={() => toggleSoftwareCollapse(softwareGroup.software)}
                      _hover={{
                        bg: colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.50'
                      }}
                      borderRadius="md"
                      p={1}
                    >
                      <Flex alignItems="flex-start" flexDirection="column">
                        <Flex alignItems="center">
                          <Box 
                            borderWidth="1px" 
                            borderRadius="full" 
                            p={1}
                            mr={2}
                            width="20px"
                            height="20px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bg={collapsedSoftware.has(softwareGroup.software) ? 
                              (colorMode === 'dark' ? 'blue.800' : 'blue.50') : 
                              (colorMode === 'dark' ? 'green.800' : 'green.50')
                            }
                            borderColor={collapsedSoftware.has(softwareGroup.software) ? 
                              (colorMode === 'dark' ? 'blue.600' : 'blue.200') : 
                              (colorMode === 'dark' ? 'green.600' : 'green.200')
                            }
                          >
                            <Icon
                              as={collapsedSoftware.has(softwareGroup.software) ? FiPlus : FiCheck}
                              color={collapsedSoftware.has(softwareGroup.software) ? 
                                (colorMode === 'dark' ? 'blue.300' : 'blue.500') : 
                                (colorMode === 'dark' ? 'green.300' : 'green.500')
                              }
                              fontSize="xs"
                              strokeWidth={3}
                            />
                          </Box>
                          <Text fontWeight="bold" fontSize="sm" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                            {softwareGroup.displayName}
                          </Text>
                        </Flex>
                        <Flex ml="28px" mt={1}>
                          <Badge 
                            colorScheme="blue" 
                            fontSize="xs"
                            variant="subtle"
                            borderRadius="full"
                            px={2}
                            py={0}
                            mr={1}
                          >
                            {softwareGroup.cves.length}
                          </Badge>
                          {getHiddenCVECount(softwareGroup.software) > 0 && (
                            <Badge 
                              colorScheme="red" 
                              fontSize="xs"
                              variant="subtle"
                              borderRadius="full"
                              px={2}
                              py={0}
                            >
                              {getHiddenCVECount(softwareGroup.software)} hidden
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                    </Flex>

                    {/* Drag handle */}
                    <Tooltip label="Drag to reorder" placement="top">
                      <Box 
                        cursor="grab" 
                        p={1.5} 
                        borderRadius="md"
                        _hover={{
                          bg: colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.100'
                        }}
                        _active={{
                          cursor: 'grabbing'
                        }}
                      >
                        <Icon 
                          as={MdDragIndicator} 
                          boxSize={5}
                          color={colorMode === 'dark' ? 'blue.300' : 'blue.500'}
                        />
                      </Box>
                    </Tooltip>
                    
                    <HStack ml={1}>
                      <Tooltip 
                        label={hasSoftwareHiddenCVEs(softwareGroup.software) ? 
                          "Show all CVEs in this group" : "Hide all CVEs in this group"} 
                        placement="top"
                      >
                        <IconButton
                          aria-label={hasSoftwareHiddenCVEs(softwareGroup.software) ? 
                            "Show all CVEs in this group" : "Hide all CVEs in this group"}
                          icon={hasSoftwareHiddenCVEs(softwareGroup.software) ? <FiEye /> : <FiEye />}
                          size="sm"
                          variant="ghost"
                          colorScheme={hasSoftwareHiddenCVEs(softwareGroup.software) ? "red" : "green"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSoftwareCVEs(softwareGroup.software, false);
                          }}
                        />
                      </Tooltip>
                    </HStack>
                  </Flex>
                </Box>
                {!collapsedSoftware.has(softwareGroup.software) && (
                  <VStack align="stretch" spacing={1.5}>
                    {softwareGroup.cves.map((cve, index) => (
                      <Flex key={cve.cveId} fontSize="sm" align="center">
                        <Text 
                          fontSize="xs" 
                          fontWeight="medium" 
                          color={colorMode === 'dark' ? 'gray.400' : 'gray.500'} 
                          width="20px" 
                          textAlign="right" 
                          mr={2}
                        >
                          {index + 1}.
                        </Text>
                        <Link
                          href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`}
                          color={hiddenCVEs.has(cve.cveId) 
                            ? (colorMode === 'dark' ? 'gray.500' : 'gray.500') 
                            : (colorMode === 'dark' ? 'cyan.300' : 'blue.500')}
                          isExternal
                          fontWeight="medium"
                          mr={2}
                          fontSize="sm"
                          width="120px"
                          display="inline-block"
                          textDecoration={hiddenCVEs.has(cve.cveId) ? 'line-through' : 'none'}
                          opacity={hiddenCVEs.has(cve.cveId) ? 0.7 : 1}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleCVEVisibility(cve.cveId);
                          }}
                          cursor="pointer"
                          _hover={{
                            textDecoration: 'underline',
                          }}
                        >
                          {cve.cveId}
                        </Link>
                        <Badge 
                          fontSize="xs" 
                          bg={getCVSSColor(cve.cvssScore)}
                          color="black"
                          fontWeight="bold"
                          variant="solid"
                          px={2}
                          py={0.5}
                          borderRadius="full"
                          minWidth="110px"
                          textAlign="center"
                          opacity={hiddenCVEs.has(cve.cveId) ? 0.5 : 1}
                        >
                          {cve.cvssScore.toFixed(1)} ({getRiskInfo(cve.cvssScore).label})
                        </Badge>
                        <Icon
                          as={FiEye}
                          ml={2}
                          color={hiddenCVEs.has(cve.cveId) ? 
                            (colorMode === 'dark' ? 'red.400' : 'red.600') : 
                            (colorMode === 'dark' ? 'green.300' : 'green.500')
                          }
                          cursor="pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCVEVisibility(cve.cveId);
                          }}
                          opacity={hiddenCVEs.has(cve.cveId) ? 1 : 0.7}
                          _hover={{ opacity: 1 }}
                        />
                      </Flex>
                    ))}
                  </VStack>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Only render the main content if not in minimal mode */}
      {!minimalMode && (
        <>
          {/* Main content HStack */}
      <HStack 
        w="full" 
        justify="space-between" 
        p={4} 
        bg={colorMode === 'dark' ? 'darkBg.surface' : 'white'}
        borderRadius="md" 
        borderWidth="1px"
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        spacing={6}
      >
        <VStack align="flex-start" spacing={3} width="full">
          <Flex width="full" justify="space-between" align="center">
            <Heading size="sm" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
              Vulnerability Results
              <Badge 
                ml={2}
                colorScheme="blue"
                fontSize="xs"
                variant={colorMode === 'dark' ? 'subtle' : 'solid'}
                borderRadius="full"
                px={2}
                py={1}
              >
                TOTAL: {sortedCVEData.length}
              </Badge>
            </Heading>

            <HStack spacing={4}>
              <FormControl display="flex" alignItems="center" w="200px">
                <FormLabel mb="0" mr={2} whiteSpace="nowrap" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>Sort by</FormLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
                  size="sm"
                  bg={colorMode === 'dark' ? 'darkBg.hover' : 'white'}
                  color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <option value="rating">CVSS Rating</option>
                  <option value="date">Date</option>
                </Select>
              </FormControl>

                  <Button
                    leftIcon={<FiSave />}
                    colorScheme="blue"
                    variant="outline"
                    onClick={saveToHistory}
                  >
                    Save to History
                  </Button>

              <Menu>
                <MenuButton 
                  as={Button}
                  leftIcon={<FiDownload />}
                  colorScheme="blue"
                  isDisabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </MenuButton>
                <MenuList>
                  <MenuItem 
                    onClick={handleCopyWordTable} 
                    icon={<FiFileText />}
                    isDisabled={isExporting}
                  >
                    Copy as Word Table (Rich)
                  </MenuItem>
                  <MenuItem 
                    onClick={handleExportPNG} 
                    icon={<FiImage />}
                    isDisabled={isExporting}
                  >
                    {isExporting ? 'Generating PNG...' : 'Download as PNG'}
                  </MenuItem>
                  <MenuItem 
                    onClick={handleExportPDF} 
                    icon={<FiFile />}
                    isDisabled={isExporting}
                  >
                    Download as PDF
                  </MenuItem>
                  <MenuItem 
                    onClick={handleExportExcel} 
                    icon={<FiGrid />}
                    isDisabled={isExporting}
                  >
                    Download as CSV
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>

          {/* Divider between header and tags */}
          <Box width="full" height="1px" bg={colorMode === 'dark' ? 'gray.600' : 'gray.200'} />

          {/* Tags section */}
          <Flex 
            wrap="wrap" 
            gap={2} 
            width="full" 
            minHeight="36px"
            bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'}
            p={2}
            borderRadius="md"
            border="1px dashed"
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            transition="all 0.3s ease"
            _hover={{
              borderColor: colorMode === 'dark' ? 'blue.400' : 'blue.200'
            }}
          >
            {selectedItems
              .filter(item => !removedSoftware.has(item.id))
              .map(item => {
                // Determine if the item is a CVE with missing CVSS data
                const hasMissingCvssData = item.type === 'cve' && 
                  cveData.some(cve => cve.cveId === item.id && cve.missingCvssData);
                
                return (
                  <Tooltip
                    key={item.id}
                    label={hiddenSoftware.has(item.id) ? "Click to show" : "Click to hide"}
                    placement="top"
                  >
                    <Tag
                      size="md"
                      variant={hiddenSoftware.has(item.id) ? "outline" : "solid"}
                      colorScheme={hasMissingCvssData ? "yellow" : "blue"}
                      cursor="pointer"
                      onClick={() => toggleVisibility(item.id)}
                      transition="all 0.2s"
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'md',
                      }}
                    >
                      <Icon 
                        as={FiEye} 
                        mr={2} 
                        opacity={0.7}
                      />
                      <TagLabel>{simplifySoftwareName(item)}</TagLabel>
                      <TagCloseButton 
                        onClick={(e) => handleTagRemove(e, item.id)}
                      />
                    </Tag>
                  </Tooltip>
                );
              })}
            <Tag
              size="md"
              variant="outline"
                  colorScheme={isAppending ? "red" : "blue"}
              cursor="pointer"
              onClick={onAddMore}
                  bgColor={colorMode === 'dark' 
                    ? (isAppending ? 'red.700' : 'blue.700') 
                    : (isAppending ? 'red.50' : 'blue.50')}
                  borderColor={colorMode === 'dark'
                    ? (isAppending ? 'red.500' : 'blue.500')
                    : (isAppending ? 'red.300' : 'blue.300')}
              borderWidth="1px"
                  borderStyle={isAppending ? "solid" : "dashed"}
              borderRadius="md"
              p={1}
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'md',
                    bgColor: colorMode === 'dark'
                      ? (isAppending ? 'red.600' : 'blue.600')
                      : (isAppending ? 'red.100' : 'blue.100'),
              }}
            >
                  <TagLabel fontWeight="medium">{isAppending ? "Cancel" : "Add More"}</TagLabel>
              <Box ml={1}>
                <FiPlus />
              </Box>
            </Tag>
          </Flex>
        </VStack>
      </HStack>

          {/* Vulnerability table */}
      <Box w="full" borderWidth="1px" borderRadius="lg" overflow="hidden"
        className="vulnerability-table"
        id="vulnerability-table"
        bg={colorMode === 'dark' ? 'darkBg.surface' : 'white'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
      >
        <Table variant="simple" layout="fixed">
          <Thead>
            <Tr>
              <Th bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'} width="20%">
                <Flex justifyContent="space-between" align="center">
                  <Text>Software</Text>
                  <Box data-export="hide">
                    <Tooltip
                      label="Enable editing for software names"
                      placement="top"
                      hasArrow
                    >
                      <Flex 
                        display="inline-flex"
                        alignItems="center"
                        borderRadius="4px"
                        padding="2px 4px"
                        mr={1}
                        bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
                      >
                        <Text 
                          fontSize="xs"
                          fontWeight="normal"
                          mr={1}
                          color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        >
                          Edit
                        </Text>
                        <Switch
                          size="sm"
                          isChecked={showSoftwareEdit}
                          onChange={(e) => setShowSoftwareEdit(e.target.checked)}
                        />
                      </Flex>
                    </Tooltip>
                  </Box>
                </Flex>
              </Th>
              <Th bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'} width="15%">
                CVE ID
              </Th>
              <Th bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'} width="38%">
                <Flex justifyContent="space-between" align="center">
                  <Text>Description</Text>
                  <Box data-export="hide">
                    <Tooltip
                      label="Enable interactive dropdown menus for vulnerability descriptions"
                      placement="top"
                      hasArrow
                    >
                      <Flex 
                        display="inline-flex"
                        alignItems="center"
                        borderRadius="4px"
                        padding="2px 4px"
                        mr={1}
                        bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
                      >
                        <Text 
                          fontSize="xs"
                          fontWeight="normal"
                          mr={1}
                          color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        >
                          Dropdowns {loading && <Spinner size="xs" ml={1} color="blue.500" />}
                        </Text>
                        <Switch
                          size="sm"
                          isChecked={showDescriptionDropdowns}
                          onChange={(e) => handleToggleDropdownDescriptions(e.target.checked)}
                          isDisabled={loading}
                        />
                      </Flex>
                    </Tooltip>
                  </Box>
                </Flex>
              </Th>
              <Th bg={colorMode === 'dark' ? 'darkBg.surface' : 'gray.50'} width="25%">
                <Flex justifyContent="space-between" align="center">
                  <Text>CVSS Score</Text>
                  <Flex data-export="hide" gap={2}>
                    <Tooltip
                      label="Show color-coded severity indicators for CVSS scores"
                      placement="top"
                      hasArrow
                    >
                      <Flex 
                        display="inline-flex"
                        alignItems="center"
                        borderRadius="4px"
                        padding="2px 4px"
                        bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
                      >
                        <Text 
                          fontSize="xs"
                          fontWeight="normal"
                          mr={1}
                          color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        >
                          Colors
                        </Text>
                        <Switch
                          size="sm"
                          isChecked={showColors}
                          onChange={(e) => setShowColors(e.target.checked)}
                        />
                      </Flex>
                    </Tooltip>
                    <Tooltip
                      label="Display CVSS vector strings below the scores"
                      placement="top"
                      hasArrow
                    >
                      <Flex 
                        display="inline-flex"
                        alignItems="center"
                        borderRadius="4px"
                        padding="2px 4px"
                        bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
                      >
                        <Text 
                          fontSize="xs"
                          fontWeight="normal"
                          mr={1}
                          color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        >
                          Vector
                        </Text>
                        <Switch
                          size="sm"
                          isChecked={showVectorString}
                          onChange={(e) => setShowVectorString(e.target.checked)}
                        />
                      </Flex>
                    </Tooltip>
                  </Flex>
                </Flex>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedCVEData.map((cve, index) => (
              <Tr key={cve.cveId}
                bg={colorMode === 'dark' 
                  ? index % 2 === 0 ? 'tableCell.dark' : 'tableCell.darkAlt'
                  : index % 2 === 0 ? 'white' : 'gray.50'}
              >
                <Td borderWidth="1px" p={4} textAlign="center" verticalAlign="middle" maxW="20%">
                  {formatSoftwareName(cve.software, cve.cveId)}
                </Td>
                <Td borderWidth="1px" p={4} textAlign="center" verticalAlign="middle" maxW="15%">
                  <Link 
                    href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`}
                    color="blue.600"
                    isExternal
                  >
                    {cve.cveId}
                  </Link>
                </Td>
                <Td borderWidth="1px" p={4} maxW="38%">
                  {renderDescription(cve)}
                </Td>
                <Td 
                  borderWidth="1px" 
                  p={4}
                  bg={showColors ? (cve.missingCvssData ? "white" : getCVSSColor(cve.cvssScore)) : undefined}
                  color={cve.missingCvssData ? "gray.500" : (showColors ? "black" : undefined)}
                  fontWeight={cve.missingCvssData ? "normal" : "bold"}
                  maxW="25%"
                >
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold" color={showColors ? "black" : undefined}>
                      {cve.missingCvssData ? 
                        <Text fontSize="sm" fontWeight="medium" fontStyle="italic" color="gray.500">
                          No CVSS Data Available
                        </Text> : 
                        `${cve.cvssScore.toFixed(1)} (${getRiskInfo(cve.cvssScore).label})`
                      }
                    </Text>
                    {showVectorString && !cve.missingCvssData && cve.vectorString && (
                      <Text fontSize="xs" fontWeight="normal" color={showColors ? "black" : undefined}>
                        {cve.vectorString}
                      </Text>
                    )}
                  </VStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

          {/* Validation modal */}
          <Modal
            isOpen={isValidationModalOpen}
            onClose={onValidationModalClose}
            isCentered
            closeOnOverlayClick={false}
            closeOnEsc={false}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Security Verification</ModalHeader>
              <ModalBody pb={6}>
                <Text>
                  A security check is required to proceed. Please enter the verification code:
                </Text>
                <Input
                  mt={4}
                  placeholder="Enter 'im sorry'"
                  value={validationInput}
                  onChange={(e) => setValidationInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleValidationResponse();
                    }
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button 
                  colorScheme="blue" 
                  mr={3} 
                  onClick={handleValidationResponse}
                >
                  Submit
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      )}
    </VStack>
  )
}
