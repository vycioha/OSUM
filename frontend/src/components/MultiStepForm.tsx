import React, { useState, useRef, useEffect } from 'react'
import { Box, VStack, Heading, Divider, IconButton, useDisclosure, useColorMode, HStack, Tooltip, Button, Flex, Alert, AlertIcon, AlertTitle, AlertDescription, CloseButton, Link, Text, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, PopoverCloseButton, Portal, useOutsideClick } from '@chakra-ui/react'
import { SearchStep } from './steps/SearchStep.tsx'
import { SelectionStep } from './steps/SelectionStep.tsx'
import { ResultsStep } from './steps/ResultsStep.tsx'
import { FiSettings, FiMoon, FiSun, FiRotateCcw, FiRotateCw, FiTrash2, FiClock, FiEye, FiInfo } from 'react-icons/fi'
import { LoadingOverlay } from './LoadingOverlay.tsx'
import { SettingsModal } from './SettingsModal.tsx'
import { UserBadge } from './UserBadge.tsx'
import { CloseIcon } from '@chakra-ui/icons'
import { CVEData } from '../types/cve.ts'

// Global type declaration for CVE cache
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

// Define a type for application state
interface AppState {
  currentStep: number;
  searchQuery: string;
  selectedItems: Array<{ type: 'cpe' | 'cve', id: string }>;
  isAppending: boolean;
  cvssSettings: {
    showVectorString: boolean;
    sortBy: 'rating' | 'date';
    preferredVersion: 'v3.1' | 'v4.0' | 'v3.0' | 'v2.0';
  };
}

export const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Array<{ type: 'cpe' | 'cve', id: string }>>([])
  const [isAppending, setIsAppending] = useState(false)
  const [showHistory, setShowHistory] = useState(true);
  const [showSummary, setShowSummary] = useState(
    localStorage.getItem('show_floating_summary') !== 'false' // default to true
  );
  const [cvssSettings, setCvssSettings] = useState({
    showVectorString: localStorage.getItem('show_vector_string') !== 'false', // default to true
    sortBy: 'rating' as 'rating' | 'date',
    preferredVersion: 'v3.1' as 'v3.1' | 'v4.0' | 'v3.0' | 'v2.0'
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [showApiKeyReminder, setShowApiKeyReminder] = useState(false);

  // State history for undo/redo functionality
  const [stateHistory, setStateHistory] = useState<AppState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState<number>(-1);
  const ignoreNextStateChange = useRef(false);

  // Add global listener for security events and history loading
  useEffect(() => {
    const handleSecurityEvent = () => {
      // Force showing the Results component where the security modal lives
      if (currentStep !== 3) {
        // Only advance to results step if we have any selected items
        if (selectedItems.length > 0) {
          setCurrentStep(3);
        }
      }
    };
    
    // Handle history loaded events
    const handleHistoryLoaded = (e: CustomEvent) => {
      if (e.detail && e.detail.items) {
        // Update selectedItems with the ones from history
        setSelectedItems(e.detail.items);
        
        // Make sure we're on the results step
        setCurrentStep(3);
        
        // Add this state to history
        const newState: AppState = {
          currentStep: 3,
          searchQuery,
          selectedItems: e.detail.items,
          isAppending: false,
          cvssSettings
        };
        
        // Add to state history
        ignoreNextStateChange.current = true;
        setStateHistory(prev => [...prev.slice(0, currentStateIndex + 1), newState]);
        setCurrentStateIndex(prev => prev + 1);
      }
    };

    // Listen for the custom events
    window.addEventListener('security_event', handleSecurityEvent);
    window.addEventListener('history_loaded', handleHistoryLoaded as EventListener);
    
    // Listen for storage changes to update the badge
    window.addEventListener('storage', () => {
      // The UserBadge component will handle its own state,
      // this just forces a re-render of the parent component
      forceUpdate();
    });

    return () => {
      window.removeEventListener('security_event', handleSecurityEvent);
      window.removeEventListener('history_loaded', handleHistoryLoaded as EventListener);
      window.removeEventListener('storage', forceUpdate);
    };
  }, [currentStep, selectedItems, currentStateIndex, searchQuery, cvssSettings]);

  // Initialize state history with initial state
  useEffect(() => {
    if (stateHistory.length === 0) {
      const initialState: AppState = {
        currentStep,
        searchQuery,
        selectedItems,
        isAppending,
        cvssSettings
      };
      setStateHistory([initialState]);
      setCurrentStateIndex(0);
    }
  }, []);

  // Update state history when state changes
  useEffect(() => {
    if (ignoreNextStateChange.current) {
      ignoreNextStateChange.current = false;
      return;
    }

    const currentState: AppState = {
      currentStep,
      searchQuery,
      selectedItems,
      isAppending,
      cvssSettings
    };

    // Only add to history if something actually changed
    const prevState = stateHistory[currentStateIndex];
    if (!prevState || 
        JSON.stringify(prevState) !== JSON.stringify(currentState)) {
      
      // Add new state and remove any future states (if we're not at the end)
      const newHistory = [...stateHistory.slice(0, currentStateIndex + 1), currentState];
      setStateHistory(newHistory);
      setCurrentStateIndex(newHistory.length - 1);
    }
  }, [currentStep, searchQuery, selectedItems, isAppending, cvssSettings]);

  const handleUndo = () => {
    if (currentStateIndex > 0) {
      const newIndex = currentStateIndex - 1;
      const prevState = stateHistory[newIndex];
      
      ignoreNextStateChange.current = true;
      
      setCurrentStep(prevState.currentStep);
      setSearchQuery(prevState.searchQuery);
      setSelectedItems(prevState.selectedItems);
      setIsAppending(prevState.isAppending);
      setCvssSettings(prevState.cvssSettings);
      
      setCurrentStateIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (currentStateIndex < stateHistory.length - 1) {
      const newIndex = currentStateIndex + 1;
      const nextState = stateHistory[newIndex];
      
      ignoreNextStateChange.current = true;
      
      setCurrentStep(nextState.currentStep);
      setSearchQuery(nextState.searchQuery);
      setSelectedItems(nextState.selectedItems);
      setIsAppending(nextState.isAppending);
      setCvssSettings(nextState.cvssSettings);
      
      setCurrentStateIndex(newIndex);
    }
  };

  const handleReset = () => {
    ignoreNextStateChange.current = true;
    setSelectedItems([]);
    setSearchQuery('');
    setHasSearched(false);
    setCurrentStep(1);
    setIsAppending(false);
    
    // Clear the global CVE cache
    if (window.osum_cve_cache) {
      window.osum_cve_cache.data = [];
      window.osum_cve_cache.processed = new Set();
      window.osum_cve_cache.fetching = false;
      window.osum_cve_cache.fetchQueue = [];
      window.osum_cve_cache.isFetchLocked = false;
    }
    
    const initialState: AppState = {
      currentStep: 1,
      searchQuery: '',
      selectedItems: [],
      isAppending: false,
      cvssSettings
    };
    setStateHistory([initialState]);
    setCurrentStateIndex(0);
  };

  const searchStepRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [loading, setLoading] = useState<{ isLoading: boolean; message: string }>({
    isLoading: false,
    message: ''
  });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const handleColorModeToggle = () => {
    toggleColorMode();
    // Force a re-render to ensure all components update
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentStep(2)
    setHasSearched(true)
  }

  const handleSelection = async (items: Array<{ type: 'cpe' | 'cve', id: string, missingCvssData?: boolean }>): Promise<{ 
    success: boolean, 
    validIds?: string[], 
    invalidIds?: string[] 
  }> => {
    setSelectedItems(isAppending ? [...selectedItems, ...items] : items)
    setCvssSettings(prev => ({
      ...prev,
      sortBy: 'rating'
    }))
    setCurrentStep(3)
    setIsAppending(false)
    
    // Return success response
    return {
      success: true,
      validIds: items.map(item => item.id)
    }
  }

  const handleAddMore = () => {
    setIsAppending(true);
    setCurrentStep(1);
    
    // Don't hide the history panel when adding more
    // This ensures the history panel stays visible during Add More mode
  };

  const handleCancelAddMore = () => {
    setIsAppending(false);
    setCurrentStep(3); // Return to results step
    
    // Trigger a re-fetch of the current data to ensure we don't have stale entries
    // This creates a clean slate for the results, removing any history influence
    window.dispatchEvent(new CustomEvent('cancel_add_more', { 
      detail: { 
        refresh: true
      }
    }));
  };

  const getStepOpacity = (step: number) => {
    if (isAppending) {
      // During append mode, show current step normally and previous steps slightly dimmed
      return currentStep === step ? 1 : 0.7;
    }
    // Normal mode - completed steps are dimmed, current step is highlighted
    if (step < currentStep) {
      return 0.5; // Completed steps
    }
    return currentStep === step ? 1 : 0.7; // Current step vs others
  };

  // Helper function to force component re-render
  const [, updateState] = useState({});
  const forceUpdate = () => updateState({});

  // Check if API key is set and show reminder if needed
  useEffect(() => {
    const apiKey = localStorage.getItem('nvd_api_key');
    const neverRemind = localStorage.getItem('never_remind_api_key') === 'true';
    
    if (!apiKey && !neverRemind) {
      setShowApiKeyReminder(true);
    }
  }, []);

  const handleNeverRemindApiKey = () => {
    localStorage.setItem('never_remind_api_key', 'true');
    setShowApiKeyReminder(false);
  };

  const handleDismissApiKeyReminder = () => {
    setShowApiKeyReminder(false);
  };

  return (
    <Box position="relative" maxWidth="1200px" margin="0 auto" width="100%">
      {loading.isLoading && <LoadingOverlay message={loading.message} />}
      
      {/* Top navigation buttons - all grouped on left side */}
      <HStack 
        position="absolute" 
        left={4} 
        top={4} 
        spacing={2} 
        zIndex={999}
        bg={colorMode === 'dark' ? 'rgba(26, 32, 44, 0.8)' : 'rgba(255, 255, 255, 0.8)'}
        backdropFilter="blur(8px)"
        borderRadius="md"
        p={1}
        boxShadow="sm"
        transition="all 0.2s ease"
        _hover={{
          boxShadow: "md"
        }}
      >
        <Box position="relative">
          <Tooltip label="Settings" placement="bottom">
            <IconButton
              ref={settingsButtonRef}
              icon={<FiSettings />}
              aria-label="Settings"
              onClick={onOpen}
              style={{ opacity: isAddHovered ? 0.5 : 1 }}
              transition="opacity 0.3s"
              width="40px"
              height="40px"
              minW="40px"
              padding={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              _hover={{ bg: colorMode === 'dark' ? 'darkBg.hover' : 'gray.100' }}
              borderRadius="md"
              overflow="visible"
              boxSizing="content-box"
            />
          </Tooltip>
          
          {showApiKeyReminder && (
            <Box
              position="absolute"
              top="calc(100% + 10px)"
              left="-10px"
              width="260px"
              p={3}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'blue.800' : 'white'}
              borderWidth="1px"
              borderColor="blue.400"
              boxShadow="md"
              zIndex={1000}
              _before={{
                content: '""',
                position: 'absolute',
                top: '-6px',
                left: '20px',
                width: '12px',
                height: '12px',
                bg: colorMode === 'dark' ? 'blue.800' : 'white',
                borderTop: '1px solid',
                borderLeft: '1px solid',
                borderColor: 'blue.400',
                transform: 'rotate(45deg)',
              }}
            >
              <CloseButton 
                size="sm" 
                position="absolute" 
                right="8px" 
                top="8px" 
                onClick={handleDismissApiKeyReminder} 
              />
              <HStack spacing={3} align="flex-start">
                <Box color="blue.500" mt={1}>
                  <FiInfo size="20px" />
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" mb={1}>API Key Not Configured</Text>
                  <Text fontSize="xs" mb={3}>
                    You're using OSUM without an API key. You may face rate limiting from the NVD API.{' '}
                    <Button onClick={onOpen} colorScheme="blue" size="xs" variant="link">
                      Configure your API key in settings
                    </Button>
                  </Text>
                  <Button 
                    onClick={handleNeverRemindApiKey} 
                    size="xs" 
                    colorScheme="gray" 
                    variant="outline"
                    width="full"
                  >
                    Don't show again
                  </Button>
                </Box>
              </HStack>
            </Box>
          )}
        </Box>
        
        <Tooltip label="History" placement="bottom">
          <IconButton
            icon={<FiClock />}
            aria-label="History"
            onClick={() => setShowHistory(!showHistory)}
            style={{ opacity: isAddHovered ? 0.5 : 1 }}
            transition="opacity 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ bg: colorMode === 'dark' ? 'darkBg.hover' : 'gray.100' }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
          />
        </Tooltip>
        
        <Tooltip label="Undo" placement="bottom">
          <IconButton
            icon={<FiRotateCcw />}
            aria-label="Undo"
            onClick={handleUndo}
            style={{ 
              opacity: !hasSearched || currentStateIndex <= 0 ? 0.4 : (isAddHovered ? 0.5 : 1),
              color: !hasSearched || currentStateIndex <= 0 ? (colorMode === 'dark' ? 'gray.500' : 'gray.400') : 'inherit'
            }}
            transition="opacity 0.3s, color 0.3s, background 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ 
              bg: !hasSearched || currentStateIndex <= 0 ? (colorMode === 'dark' ? 'gray.800' : 'gray.100') : (colorMode === 'dark' ? 'darkBg.hover' : 'gray.100') 
            }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
            isDisabled={!hasSearched || currentStateIndex <= 0}
          />
        </Tooltip>
        
        <Tooltip label="Redo" placement="bottom">
          <IconButton
            icon={<FiRotateCw />}
            aria-label="Redo"
            onClick={handleRedo}
            style={{ 
              opacity: !hasSearched || currentStateIndex >= stateHistory.length - 1 ? 0.4 : (isAddHovered ? 0.5 : 1),
              color: !hasSearched || currentStateIndex >= stateHistory.length - 1 ? (colorMode === 'dark' ? 'gray.500' : 'gray.400') : 'inherit'
            }}
            transition="opacity 0.3s, color 0.3s, background 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ 
              bg: !hasSearched || currentStateIndex >= stateHistory.length - 1 ? (colorMode === 'dark' ? 'gray.800' : 'gray.100') : (colorMode === 'dark' ? 'darkBg.hover' : 'gray.100') 
            }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
            isDisabled={!hasSearched || currentStateIndex >= stateHistory.length - 1}
          />
        </Tooltip>

        <Tooltip label="Reset Table" placement="bottom">
          <IconButton
            icon={<FiTrash2 />}
            aria-label="Reset Table"
            onClick={handleReset}
            style={{ 
              opacity: !hasSearched || selectedItems.length === 0 ? 0.4 : (isAddHovered ? 0.5 : 1),
              color: !hasSearched || selectedItems.length === 0 ? (colorMode === 'dark' ? 'gray.500' : 'gray.400') : 'inherit'
            }}
            transition="opacity 0.3s, color 0.3s, background 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ 
              bg: !hasSearched || selectedItems.length === 0 ? (colorMode === 'dark' ? 'gray.800' : 'gray.100') : (colorMode === 'dark' ? 'darkBg.hover' : 'gray.100') 
            }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
            isDisabled={!hasSearched || selectedItems.length === 0}
          />
        </Tooltip>

        <Tooltip label={colorMode === 'dark' ? "Light mode" : "Dark mode"} placement="bottom">
          <IconButton
            icon={colorMode === 'dark' ? <FiSun /> : <FiMoon />}
            aria-label="Toggle dark mode"
            onClick={handleColorModeToggle}
            style={{ opacity: isAddHovered ? 0.5 : 1 }}
            transition="opacity 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ bg: colorMode === 'dark' ? 'darkBg.hover' : 'gray.100' }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
          />
        </Tooltip>
        
        <Tooltip label="Summary" placement="bottom">
          <IconButton
            icon={<FiEye />}
            aria-label="Toggle Summary"
            onClick={() => setShowSummary(!showSummary)}
            style={{ opacity: isAddHovered ? 0.5 : 1 }}
            transition="opacity 0.3s"
            width="40px"
            height="40px"
            minW="40px"
            padding={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ bg: colorMode === 'dark' ? 'darkBg.hover' : 'gray.100' }}
            borderRadius="md"
            overflow="visible"
            boxSizing="content-box"
          />
        </Tooltip>
      </HStack>
      
      <SettingsModal isOpen={isOpen} onClose={onClose} />
      <Box 
        mb={8} 
        position="relative" 
        width="100%" 
        height="40px"
      >
        {/* Absolutely centered OSUM title */}
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          width="auto"
          textAlign="center"
          zIndex="1"
        >
          <Heading 
            style={{ opacity: isAddHovered ? 0.5 : 1 }} 
            transition="opacity 0.3s"
          >
            OSUM
          </Heading>
        </Box>
        
        {/* UserBadge will render nothing when !hasBadge, so it doesn't affect layout */}
        <UserBadge />
      </Box>

      {/* Always render a minimal ResultsStep to handle history/summary panels */}
      <Box position="absolute" top={0} left={0} width="1px" height="1px" overflow="hidden" aria-hidden="true">
        <ResultsStep 
          selectedItems={selectedItems}
          cvssSettings={cvssSettings} 
          onSettingsChange={setCvssSettings}
          onAddMore={() => {}}
          onAddHoverChange={() => {}}
          onLoadingChange={() => {}}
          showHistory={showHistory}
          onHistoryChange={setShowHistory}
          showSummary={showSummary}
          onSummaryChange={setShowSummary}
          minimalMode={true}
          isAppending={isAppending}
        />
      </Box>
      
      <VStack
        spacing={6}
        align="stretch"
        w="100%"
        p={6}
        borderRadius="lg"
        position="relative"
        margin="0 auto"
        left="0"
        right="0"
      >
        {isAddHovered && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg={isAppending ? "red.50" : "blue.50"}
            opacity={0.5}
            zIndex={1}
            pointerEvents="none"
            borderRadius="lg"
          />
        )}
        <Box 
          ref={searchStepRef}
          opacity={getStepOpacity(1)}
          transition="all 0.4s ease-in-out"
          position="relative"
          zIndex={isAddHovered ? 10 : 1}
          maxW="md"
          mx="auto"
          transform={isAddHovered ? "translateY(-8px)" : "none"}
          _hover={{ opacity: isAppending || currentStep === 1 ? 1 : 0.5 }}
        >
          {isAddHovered && (
            <Box
              position="absolute"
              top="-16px"
              left="-16px"
              right="-16px"
              bottom="-16px"
              borderRadius="2xl"
              border="2px solid"
              borderColor={isAppending ? "red.400" : "blue.400"}
              bg="white"
              boxShadow={
                isAppending 
                  ? `
                    0 10px 30px -5px rgba(225, 66, 66, 0.4),
                    0 20px 50px -10px rgba(0, 0, 0, 0.1),
                    0 0 0 2px rgba(225, 66, 66, 0.2)
                  `
                  : `
                    0 10px 30px -5px rgba(66, 153, 225, 0.4),
                    0 20px 50px -10px rgba(0, 0, 0, 0.1),
                    0 0 0 2px rgba(66, 153, 225, 0.2)
                  `
              }
              opacity={0.99}
              transition="all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
              pointerEvents="none"
              transform="scale(1.03)"
            />
          )}
          <Box
            position="relative"
            bg={isAddHovered ? "white" : "transparent"}
            borderRadius="xl"
            transition="all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
            transform={isAddHovered ? "scale(1.02)" : "scale(1)"}
          >
            <SearchStep 
              onSearch={handleSearch} 
              disabled={false} 
            />
          </Box>
        </Box>

        {(currentStep >= 2 || isAppending) && (
          <Box 
            opacity={getStepOpacity(2)}
            transition="all 0.4s ease-in-out"
            maxW="md"
            mx="auto"
            w="full"
            _hover={{ opacity: isAppending || currentStep === 2 ? 1 : 0.5 }}
          >
            <Divider my={4} />
            <SelectionStep 
              onSelect={handleSelection}
              searchQuery={searchQuery}
              cvssSettings={cvssSettings}
              onSettingsChange={setCvssSettings}
              onLoadingChange={(isLoading: boolean, message: string) => setLoading({ isLoading, message })}
              disabled={false}
              isAppending={isAppending}
            />
          </Box>
        )}

        {(currentStep === 3 || isAppending) && (
          <Box 
            opacity={currentStep === 3 ? 1 : 0.7}
            transition="all 0.4s ease-in-out"
            position="relative"
          >
            <Divider my={4} />
            <ResultsStep 
              selectedItems={selectedItems}
              cvssSettings={cvssSettings} 
              onSettingsChange={setCvssSettings}
              onAddMore={isAppending ? handleCancelAddMore : handleAddMore}
              onAddHoverChange={setIsAddHovered}
              onLoadingChange={(isLoading: boolean, message: string) => setLoading({ isLoading, message })}
              showHistory={showHistory}
              onHistoryChange={setShowHistory}
              showSummary={showSummary}
              onSummaryChange={setShowSummary}
              minimalMode={false}
              isAppending={isAppending}
            />
          </Box>
        )}
      </VStack>
    </Box>
  )
}
