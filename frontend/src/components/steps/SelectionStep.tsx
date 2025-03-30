import React, { useState, useEffect, useRef } from 'react'
import { 
  VStack, 
  Heading, 
  Button, 
  Select, 
  Text,
  Box,
  HStack,
  Input,
  Tag,
  TagLabel,
  TagCloseButton,
  Tooltip,
  IconButton,
  useToast,
  useColorMode
} from '@chakra-ui/react'
import { InfoIcon } from '@chakra-ui/icons'

interface SelectionStepProps {
  onSelect: (items: Array<{ type: 'cpe' | 'cve', id: string }>) => Promise<{ 
    success: boolean, 
    validIds?: string[], 
    invalidIds?: string[] 
  }>;
  searchQuery: string;
  cvssSettings: {
    showVectorString: boolean;
    sortBy: string;
    preferredVersion: string;
  };
  onSettingsChange: (settings: any) => void;
  disabled: boolean;
  isAppending?: boolean;
  onLoadingChange: (isLoading: boolean, message: string) => void;
}

interface CPEOption {
  title: string
  cpeName: string
}

interface SelectedItem {
  type: 'cpe' | 'cve';
  id: string;
}

interface CVEStatus {
  id: string;
  status: 'valid' | 'partial' | 'invalid';
}

export const SelectionStep = ({ 
  onSelect, 
  searchQuery, 
  disabled, 
  isAppending,
  onLoadingChange 
}: SelectionStepProps) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [cpeInput, setCpeInput] = useState('');
  const [cpeOptions, setCpeOptions] = useState<CPEOption[]>([]);
  const [selected, setSelected] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cveInput, setCveInput] = useState('');
  const [cveTags, setCveTags] = useState<string[]>([]);
  const [processingCVEs, setProcessingCVEs] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cveStatus, setCveStatus] = useState<CVEStatus[]>([]);
  const isFetchingRef = useRef(false);
  const lastSearchRef = useRef<string>('');
  const [cveId, setCveId] = useState<string>('');
  const { colorMode } = useColorMode();
  
  // Function to detect unusual patterns in user input
  const detectSpecialPattern = (input: string): boolean => {
    // Common special patterns
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
      /\$/i,
      
      // Template patterns
      /\{\{.*\}\}/,
      /\$\{.*\}/,
      /#\{.*\}/,
      /<\%.*\%>/,
      /\${.*}/,
      /\{\{.*\|.*\}\}/,
      /\{\{.*\..*\}\}/,
      
      // SQL patterns
      /'--/i,
      /\/\*/i,
      /UNION SELECT/i,
      
      // Other special inputs
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

  useEffect(() => {
    const fetchCPEs = async () => {
      onLoadingChange(true, 'Searching for software...');
      // Skip if we've already fetched this search query
      if (searchQuery === lastSearchRef.current) return;
      lastSearchRef.current = searchQuery;

      setLoading(true);
      try {
        const apiKey = localStorage.getItem('nvd_api_key');
        const fetchLimit = parseInt(localStorage.getItem('cpe_fetch_limit') || '100', 10);
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['apiKey'] = apiKey;
        }

        const response = await fetch(`http://localhost:5000/api/v1/cpe_search?keyword=${encodeURIComponent(searchQuery)}&limit=${fetchLimit}`, 
          { headers }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setCpeOptions(data);
        if (data.length > 0) {
          setSelected('');
        }
      } catch (error) {
        console.error('Error fetching CPEs:', error);
      }
      setLoading(false);
      onLoadingChange(false, '');
    };

    if (searchQuery) {
      fetchCPEs();
    }
  }, [searchQuery])

  const handleCPESelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    
    // Check for unusual patterns immediately
    if (detectSpecialPattern(newValue)) {
      // Flag using obscure key
      localStorage.setItem('app_usr_mdl_state', '1');
      
      // Event for direct notification
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Also dispatch storage event
      window.dispatchEvent(new Event('storage'));
    }
    
    setSelected(newValue);
  };

  const handleSelect = async (limit: number, sortBy: 'recent' | 'severe') => {
    if (selected) {
      // Check for unusual patterns before proceeding
      if (detectSpecialPattern(selected)) {
        // Flag using obscure key
        localStorage.setItem('app_usr_mdl_state', '1');
        
        // Event for direct notification
        window.dispatchEvent(new CustomEvent('security_event'));
        
        // Also dispatch storage event
        window.dispatchEvent(new Event('storage'));
      }
      
      onLoadingChange(true, 'Fetching vulnerabilities...');
      try {
        const apiKey = localStorage.getItem('nvd_api_key');
        const preferredVersion = localStorage.getItem('preferred_cvss_version') || '3.1';
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['apiKey'] = apiKey;
        }

        const url = `http://localhost:5000/api/v1/get_cves?cpeName=${encodeURIComponent(selected)}&preferredVersion=${preferredVersion}&sortBy=${sortBy}&limit=${limit}`;
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        onSelect([{ type: 'cpe', id: selected }]);
      } catch (error) {
        console.error('Error fetching CVEs:', error);
      } finally {
        onLoadingChange(false, '');
      }
    }
  };

  const handleGetAll = async () => {
    if (isFetchingRef.current || !selected) return;
    
    // Check for unusual patterns before proceeding
    if (detectSpecialPattern(selected)) {
      // Flag using obscure key
      localStorage.setItem('app_usr_mdl_state', '1');
      
      // Event for direct notification
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Also dispatch storage event
      window.dispatchEvent(new Event('storage'));
    }
    
    isFetchingRef.current = true;
    
    onLoadingChange(true, 'Fetching all vulnerabilities...');
    try {
      const apiKey = localStorage.getItem('nvd_api_key');
      const preferredVersion = localStorage.getItem('preferred_cvss_version') || '3.1';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['apiKey'] = apiKey;
      }

      const url = `http://localhost:5000/api/v1/get_cves?cpeName=${encodeURIComponent(selected)}&preferredVersion=${preferredVersion}`;
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      onSelect([{ type: 'cpe', id: selected }]);
    } catch (error) {
      console.error('Error fetching CVEs:', error);
    } finally {
      onLoadingChange(false, '');
      isFetchingRef.current = false;
    }
  };

  const handleCveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check for unusual patterns
    if (detectSpecialPattern(value)) {
      // Flag using obscure key
      localStorage.setItem('app_usr_mdl_state', '1');
      
      // Event for direct notification
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Also dispatch storage event
      window.dispatchEvent(new Event('storage'));
    }
    
    // Auto-process if input contains commas (likely a paste operation with multiple CVEs)
    if (value.includes(',')) {
      // Split by comma and clean up each entry
      const newCves = value
        .split(',')
        .map(cve => cve.trim())
        .filter(cve => cve.length > 0 && cve.match(/CVE-\d+-\d+/i)); // Only include valid-looking CVE IDs
      
      // If we found multiple valid CVE patterns, process them immediately
      if (newCves.length > 1) {
        // Add new CVEs that aren't already in tags
        newCves.forEach(cve => {
          if (!cveTags.includes(cve)) {
            setCveTags(prev => [...prev, cve]);
          }
        });
        setCveInput('');
        return;
      }
    }
    
    // Handle the regular case where input ends with comma
    if (value.endsWith(',')) {
      // Split by comma and clean up each entry
      const newCves = value
        .split(',')
        .map(cve => cve.trim())
        .filter(cve => cve.length > 0); // Remove empty entries
      
      // Add new CVEs that aren't already in tags
      newCves.forEach(cve => {
        if (!cveTags.includes(cve)) {
          setCveTags(prev => [...prev, cve]);
        }
      });
      setCveInput('');
    } else {
      setCveInput(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cveInput.trim()) {
      // Check for unusual patterns before processing
      if (detectSpecialPattern(cveInput)) {
        // Flag using obscure key
        localStorage.setItem('app_usr_mdl_state', '1');
        
        // Event for direct notification
        window.dispatchEvent(new CustomEvent('security_event'));
        
        // Also dispatch storage event
        window.dispatchEvent(new Event('storage'));
      }
      
      // Split by comma and clean up each entry
      const newCves = cveInput
        .split(',')
        .map(cve => cve.trim())
        .filter(cve => cve.length > 0); // Remove empty entries
      
      // Add new CVEs that aren't already in tags
      newCves.forEach(cve => {
        if (!cveTags.includes(cve)) {
          setCveTags(prev => [...prev, cve]);
        }
      });
      setCveInput('');
      e.preventDefault();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCveTags(cveTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddCustomCVE = async () => {
    if (cveTags.length === 0) return;
    
    setProcessingCVEs(true);
    setCveStatus([]);
    setStatusMessage('Processing CVEs...');
    onLoadingChange(true, 'Processing CVE IDs...');
    
    try {
      const apiKey = localStorage.getItem('nvd_api_key');
      const preferredVersion = localStorage.getItem('preferred_cvss_version') || '3.1';
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['apiKey'] = apiKey;
      }
      
      // Process CVEs
      const processedCVEs: Array<{ type: 'cpe' | 'cve', id: string, missingCvssData?: boolean }> = [];
      const validIds: string[] = [];
      const invalidIds: string[] = [];
      const partialIds: string[] = [];
      
      // Process each CVE ID in sequence
      for (const cveId of cveTags) {
        setStatusMessage(`Processing ${cveId}...`);
        
        try {
          const response = await fetch(
            `http://localhost:5000/api/v1/get_cve_by_id?cveId=${encodeURIComponent(cveId)}&preferredVersion=${preferredVersion}`,
            { headers }
          );
          
          if (!response.ok) {
            // If we get a 404, mark as invalid
            if (response.status === 404) {
              invalidIds.push(cveId);
              setCveStatus(prev => [...prev, { id: cveId, status: 'invalid' }]);
              continue;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Parse response
          const data = await response.json();
          
          // Check response based on the format
          if (Array.isArray(data) && data.length > 0) {
            // Valid, complete CVE data
            processedCVEs.push({ type: 'cve', id: cveId });
            validIds.push(cveId);
            setCveStatus(prev => [...prev, { id: cveId, status: 'valid' }]);
          } else if (Array.isArray(data) && data.length === 0) {
            // No data found, mark as invalid
            invalidIds.push(cveId);
            setCveStatus(prev => [...prev, { id: cveId, status: 'invalid' }]);
          } else if (data.missingCvssData) {
            // Partial data (missing CVSS)
            processedCVEs.push({ type: 'cve', id: cveId, missingCvssData: true });
            partialIds.push(cveId);
            setCveStatus(prev => [...prev, { id: cveId, status: 'partial' }]);
          } else {
            // Unexpected response format
            invalidIds.push(cveId);
            setCveStatus(prev => [...prev, { id: cveId, status: 'invalid' }]);
          }
        } catch (error) {
          console.error(`Error processing ${cveId}:`, error);
          invalidIds.push(cveId);
          setCveStatus(prev => [...prev, { id: cveId, status: 'invalid' }]);
        }
      }
      
      // Update tags with failed CVEs
      setCveTags(invalidIds);
      
      // If we have processed items, send them to the parent
      if (processedCVEs.length > 0) {
        console.log('%c Sending processed CVEs to parent:', 'color: #28a745', processedCVEs);
        
        try {
          await onSelect(processedCVEs);
          
          toast({
            title: "CVE Processing Results",
            description: `${processedCVEs.length} CVEs added to table. ${invalidIds.length} failed and are shown in red.`,
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "top-right"
          });
        } catch (selectError) {
          console.error('%c Error from parent component:', 'color: #cb2431', selectError);
          
          toast({
            title: "Error Adding CVEs",
            description: "Failed to add CVEs to the table. See console for details.",
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "top-right"
          });
        }
      } else if (invalidIds.length > 0) {
        toast({
          title: "CVE Processing Failed",
          description: `All ${invalidIds.length} CVEs failed. Failed CVEs are shown in red.`,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top-right"
        });
      }
    } catch (error) {
      console.error('%c Error processing CVEs:', 'color: #cb2431', error);
      toast({
        title: "Error processing CVEs",
        description: "An error occurred while processing your CVEs. Check console for details.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
      
      // Keep all CVEs as tags
      setCveTags(cveTags);
    } finally {
      setProcessingCVEs(false);
      onLoadingChange(false, '');
      console.groupEnd();
    }
  };

  return (
    <VStack spacing={4} w="full" maxW="md">
      <Heading size="lg" color={disabled ? "gray.400" : "blue.600"}>
        Select CPE
      </Heading>
      <Select
        placeholder="Select a CPE"
        value={selected}
        onChange={handleCPESelect}
        isDisabled={disabled || loading}
        size="lg"
        bg={colorMode === 'dark' ? 'gray.800' : 'white'}
        color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        borderWidth="1px"
        _hover={{
          borderColor: colorMode === 'dark' ? 'blue.400' : 'blue.300',
        }}
        _focus={{
          borderColor: colorMode === 'dark' ? 'blue.500' : 'blue.500',
          boxShadow: colorMode === 'dark' ? '0 0 0 1px #4299E1' : '0 0 0 1px #4299E1',
        }}
        _placeholder={{
          color: colorMode === 'dark' ? 'gray.400' : 'gray.500',
          opacity: 1,
        }}
      >
        {cpeOptions.map((option) => (
          <option key={option.cpeName} value={option.cpeName}>
            {option.title} ({option.cpeName})
          </option>
        ))}
      </Select>
      
      <HStack spacing={4} width="full">
        <Button
          flex={1}
          colorScheme="blue"
          size="lg"
          isDisabled={!selected || disabled}
          isLoading={loading}
          onClick={handleGetAll}
          bg={colorMode === 'dark' ? 'blue.500' : 'blue.500'}
          color="white"
          _hover={{ 
            bg: colorMode === 'dark' ? 'blue.600' : 'blue.600' 
          }}
          _active={{
            bg: colorMode === 'dark' ? 'blue.700' : 'blue.700'
          }}
        >
          {isAppending ? 'Append Vulnerabilities' : 'Get All Vulnerabilities'}
        </Button>
      </HStack>

      {cpeOptions.length > 0 && (
        <>
          <HStack spacing={2} alignItems="center">
            <Text fontSize="sm" color="gray.500">
              Or add CVEs by ID
            </Text>
            <Tooltip
              label="Enter multiple CVEs by separating them with commas or pressing Enter after each one"
              placement="top"
              hasArrow
            >
              <IconButton
                icon={<InfoIcon />}
                aria-label="CVE input information"
                variant="ghost"
                size="xs"
                color="gray.500"
                _hover={{ color: "blue.500" }}
              />
            </Tooltip>
          </HStack>
          <VStack spacing={2} width="full">
            <Box width="full">
              <HStack spacing={2} mb={2} flexWrap="wrap">
                {cveTags.map((tag, index) => {
                  const status = cveStatus.find(s => s.id === tag)?.status || 'valid';
                  let colorScheme = 'blue';
                  
                  if (status === 'invalid') {
                    colorScheme = 'red';
                  } else if (status === 'partial') {
                    colorScheme = 'yellow';
                  }
                  
                  return (
                    <Tag
                      key={index}
                      size="md"
                      borderRadius="full"
                      variant="solid"
                      colorScheme={colorScheme}
                      marginY={1}
                    >
                      <TagLabel>{tag}</TagLabel>
                      <TagCloseButton onClick={() => removeTag(tag)} />
                    </Tag>
                  );
                })}
              </HStack>
              <HStack spacing={4}>
                <Input
                  placeholder="Enter CVE ID(s), use commas for multiple"
                  value={cveInput}
                  onChange={handleCveInputChange}
                  isDisabled={disabled || loading || processingCVEs}
                  onKeyDown={handleKeyDown}
                  size="lg"
                  bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                  color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                  borderWidth="1px"
                  _hover={{
                    borderColor: colorMode === 'dark' ? 'blue.400' : 'blue.300',
                  }}
                  _focus={{
                    borderColor: colorMode === 'dark' ? 'blue.500' : 'blue.500',
                    boxShadow: colorMode === 'dark' ? '0 0 0 1px #4299E1' : '0 0 0 1px #4299E1',
                  }}
                  _placeholder={{
                    color: colorMode === 'dark' ? 'gray.400' : 'gray.500',
                    opacity: colorMode === 'dark' ? 0.8 : 0.6,
                  }}
                />
                <Button
                  colorScheme="blue"
                  size="lg"
                  isDisabled={(cveTags.length === 0 && !cveInput.trim()) || processingCVEs || disabled || loading}
                  isLoading={processingCVEs}
                  loadingText="Processing..."
                  onClick={handleAddCustomCVE}
                  bg={colorMode === 'dark' ? 'blue.500' : 'blue.500'}
                  color="white"
                  _hover={{ 
                    bg: colorMode === 'dark' ? 'blue.600' : 'blue.600' 
                  }}
                  _active={{
                    bg: colorMode === 'dark' ? 'blue.700' : 'blue.700'
                  }}
                >
                  {isAppending ? 'Append CVEs' : 'Add CVEs'}
                </Button>
              </HStack>
            </Box>
          </VStack>
        </>
      )}
    </VStack>
  )
}
