import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Box,
  Button,
  Text,
  VStack,
  Input,
  useDisclosure,
  useColorMode,
  useToast,
  Flex,
  Icon,
  Badge
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiTerminal } from 'react-icons/fi';

const USER_ACHIEVEMENT_KEY = 'usr_xp_lvl';

// Blinking cursor animation
const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

export const AccessibilityMonitor: React.FC = () => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  // Terminal typing simulation states
  const [terminalReady, setTerminalReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [commandText1, setCommandText1] = useState('');
  const [responseText1, setResponseText1] = useState('');
  const [commandText2, setCommandText2] = useState('');
  const [responseText2, setResponseText2] = useState('');
  
  // Obscure localStorage key
  const USER_PREFERENCE_KEY = 'app_usr_mdl_state';
  
  // Check for flag and show modal when needed
  useEffect(() => {
    const checkUserPreference = () => {
      const preferenceFlag = localStorage.getItem(USER_PREFERENCE_KEY);
      if (preferenceFlag === '1') {
        // Reset terminal state completely when opening
        setCommandText1('');
        setResponseText1('');
        setCommandText2('');
        setResponseText2('');
        setTerminalReady(false);
        setCurrentStep(0);
        onOpen();
      }
    };
    
    // Check on mount and when storage changes
    checkUserPreference();
    
    // Listen for storage events
    window.addEventListener('storage', checkUserPreference);
    
    // Listen for custom events (renamed to be less obvious)
    window.addEventListener('security_event', checkUserPreference);
    
    return () => {
      window.removeEventListener('storage', checkUserPreference);
      window.removeEventListener('security_event', checkUserPreference);
    };
  }, [onOpen]);
  
  // Terminal typing effect
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset terminal state when opened
    if (isOpen && currentStep === 0) {
      setCommandText1('');
      setResponseText1('');
      setCommandText2('');
      setResponseText2('');
      setTerminalReady(false);
      
      // Simulate a more realistic typing pattern
      const cmd1 = 'whoami';
      let index = 0;
      
      const humanTyping = () => {
        // Random typing speed between 50ms and 250ms
        const randomDelay = Math.floor(Math.random() * 200) + 50;
        
        // Occasional longer pause (10% chance)
        const shouldPause = Math.random() < 0.1;
        const pauseDuration = shouldPause ? Math.floor(Math.random() * 300) + 200 : 0;
        
        setTimeout(() => {
          if (index <= cmd1.length) {
            setCommandText1(cmd1.substring(0, index));
            index++;
            if (index <= cmd1.length) {
              humanTyping();
            } else {
              // Command completed, show response immediately
              setTimeout(() => {
                setResponseText1('unauthorized_user');
                
                // Move to next step immediately after response appears
                setCurrentStep(1);
              }, 300);
            }
          }
        }, randomDelay + pauseDuration);
      };
      
      humanTyping();
    }
    
    // Type the second command after first is done
    if (isOpen && currentStep === 1) {
      const cmd2 = 'cat /etc/security/notice.txt';
      let index = 0;
      
      const humanTyping = () => {
        // Random typing speed between 50ms and 250ms
        const randomDelay = Math.floor(Math.random() * 200) + 50;
        
        // Occasional longer pause (10% chance)
        const shouldPause = Math.random() < 0.1;
        const pauseDuration = shouldPause ? Math.floor(Math.random() * 300) + 200 : 0;
        
        setTimeout(() => {
          if (index <= cmd2.length) {
            setCommandText2(cmd2.substring(0, index));
            index++;
            if (index <= cmd2.length) {
              humanTyping();
            } else {
              // Command completed, show response immediately
              setTimeout(() => {
                setResponseText2('Unauthorized access attempt detected. Type "im sorry" to continue.');
                
                // Enable input immediately after the response appears
                setTerminalReady(true);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 100);
              }, 300);
            }
          }
        }, randomDelay + pauseDuration);
      };
      
      humanTyping();
    }
  }, [isOpen, currentStep]);
  
  // Focus input when terminal becomes ready
  useEffect(() => {
    if (terminalReady && inputRef.current) {
      inputRef.current.focus();
    }
  }, [terminalReady]);
  
  // Handle user input submission
  const handleSubmission = () => {
    if (userInput.toLowerCase() === 'im sorry') {
      setIsSubmitting(true);
      setResponseMessage('Ha ha u apologized! Thanks for staying curious! You earned the 1337 h4x0r badge.');
      setCountdown(5);
      
      localStorage.removeItem(USER_PREFERENCE_KEY);
      
      // Add a user achievement in an obscure way
      localStorage.setItem(USER_ACHIEVEMENT_KEY, '1');
      
      // Dispatch multiple events to ensure all components update
      window.dispatchEvent(new Event('storage'));
      
      // Special event for the matrix rain
      window.dispatchEvent(new CustomEvent('badge_unlocked', { 
        detail: { type: 'matrix', achieved: true }
      }));
      
      // Show success toast
      toast({
        title: "133t h4x0r Badge Unlocked!",
        description: "Your mad hacker skills have been recognized. Badge awarded!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              setIsSubmitting(false);
              setResponseMessage('');
              setUserInput('');
              onClose();
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect input. Type 'im sorry' to proceed.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Terminal colors - always dark theme for terminal regardless of app theme
  const terminalFg = 'rgba(220, 220, 220, 0.9)';
  const terminalBg = 'rgba(25, 25, 25, 0.95)';
  const terminalBorder = 'gray.700';
  const promptColor = 'cyan.300';
  const warningColor = 'yellow.300';
  const commentColor = 'gray.400';
  const successColor = 'green.300';
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} // Empty function to prevent normal closing
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="md"
      isCentered
    >
      <ModalOverlay 
        backdropFilter="blur(5px)"
        bg="rgba(0, 0, 0, 0.7)"
      />
      <ModalContent
        bg={terminalBg}
        borderWidth="1px"
        borderColor={terminalBorder}
        boxShadow="dark-lg"
        borderRadius="md"
        fontFamily="monospace"
        overflow="hidden"
        maxW="500px"
      >
        <Box
          bg="gray.800"
          color={terminalFg}
          p={2}
          borderBottom={`1px solid ${terminalBorder}`}
        >
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2}>
              <Icon as={FiTerminal} color={terminalFg} />
              <Text fontSize="xs" fontWeight="medium">Terminal</Text>
            </Flex>
            {isSubmitting && (
              <Badge 
                colorScheme="yellow" 
                variant="solid" 
                borderRadius="full" 
                px={2}
                fontSize="xs"
              >
                Closing in {countdown}s
              </Badge>
            )}
          </Flex>
        </Box>
        
        <Box 
          p={4} 
          bg={terminalBg}
          color={terminalFg}
          fontFamily="monospace"
        >
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" color={warningColor}>
              Security protocol activated.
            </Text>
            
            {/* First command - animated typing */}
            <Box pb={2}>
              <Text fontSize="sm" mb={1}>
                <Text as="span" color={promptColor}>user@osum:~$</Text> {commandText1}
                {currentStep === 0 && !terminalReady && (
                  <Box 
                    as="span" 
                    h="100%" 
                    bg="gray.400" 
                    display="inline-block"
                    ml={0.5}
                    w="8px"
                    animation={`${blink} 1s step-end infinite`}
                  />
                )}
              </Text>
              {responseText1 && (
                <Box>
                  <Text fontSize="sm" mb={1}>{responseText1}</Text>
                </Box>
              )}
            </Box>
            
            {/* Second command - appears only after first response */}
            {currentStep >= 1 && (
              <Box pb={2}>
                <Text fontSize="sm" mb={1}>
                  <Text as="span" color={promptColor}>user@osum:~$</Text> {commandText2}
                  {currentStep === 1 && !terminalReady && (
                    <Box 
                      as="span" 
                      h="100%" 
                      bg="gray.400" 
                      display="inline-block"
                      ml={0.5}
                      w="8px"
                      animation={`${blink} 1s step-end infinite`}
                    />
                  )}
                </Text>
                {responseText2 && (
                  <Box>
                    <Text fontSize="sm" color={commentColor} mb={1}>{responseText2}</Text>
                  </Box>
                )}
              </Box>
            )}
            
            {/* User input field - only shown when terminal is ready */}
            {terminalReady && (
              <Flex align="center">
                <Text color={promptColor} mr={2} fontSize="sm">
                  user@osum:~$
                </Text>
                <Box position="relative" flex="1">
                  <Input
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onFocus={() => setCursorVisible(true)}
                    onBlur={() => setCursorVisible(false)}
                    placeholder=""
                    variant="unstyled"
                    size="sm"
                    fontFamily="monospace"
                    color={terminalFg}
                    bg="transparent"
                    p={0}
                    height="20px"
                    isReadOnly={isSubmitting}
                    _focus={{
                      outline: "none",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitting) {
                        handleSubmission();
                      }
                    }}
                  />
                  {cursorVisible && userInput.length === 0 && !isSubmitting && (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      height="100%"
                      width="8px"
                      bg="gray.400"
                      animation={`${blink} 1s step-end infinite`}
                    />
                  )}
                </Box>
              </Flex>
            )}
            
            {responseMessage && (
              <Box 
                mt={2} 
                p={3} 
                bg="gray.800" 
                borderRadius="md"
                borderLeft="2px solid"
                borderColor={successColor}
              >
                <Text fontSize="sm" color={successColor} fontWeight="bold" mb={1}>
                  <Text as="span" color={promptColor}>system:~$</Text> {responseMessage}
                </Text>
                {isSubmitting && (
                  <Flex mt={2} px={2} justify="center" align="center">
                    <Badge colorScheme="green" px={2} py={0.5}>
                      Achievement unlocked: 1337 h4x0r
                    </Badge>
                  </Flex>
                )}
              </Box>
            )}
          </VStack>
        </Box>
      </ModalContent>
    </Modal>
  );
}; 