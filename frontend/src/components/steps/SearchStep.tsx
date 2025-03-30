import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, VStack, Heading, useToast, useColorMode } from '@chakra-ui/react'

interface SearchStepProps {
  onSearch: (query: string) => void
  disabled?: boolean
}

export const SearchStep: React.FC<SearchStepProps> = ({ 
  onSearch,
  disabled = false
}) => {
  const [query, setQuery] = useState('')
  const [detectedPattern, setDetectedPattern] = useState(false)
  const toast = useToast()
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

  // Handle changes to the query input
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Check for special patterns in real-time
    if (detectSpecialPattern(newValue)) {
      // Set a flag in localStorage and mark as detected
      localStorage.setItem('app_usr_mdl_state', '1');
      setDetectedPattern(true);
      
      // Dispatch a custom event for immediate modal display
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Also dispatch a storage event for compatibility
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Handle form submission for search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for special patterns on submit as well
    if (detectSpecialPattern(query) && !detectedPattern) {
      // Set a flag in localStorage
      localStorage.setItem('app_usr_mdl_state', '1');
      setDetectedPattern(true);
      
      // Dispatch a custom event for immediate modal display
      window.dispatchEvent(new CustomEvent('security_event'));
      
      // Also dispatch a storage event for compatibility
      window.dispatchEvent(new Event('storage'));
    }
    
    // Always proceed with the search to avoid raising suspicion
    onSearch(query);
  };

  return (
    <form onSubmit={handleSearch} data-step="search">
      <VStack 
        spacing={4} 
        align="stretch"
        opacity={disabled ? 0.7 : 1}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <Heading size="lg" color={disabled ? "gray.400" : "blue.600"}>
          Search for Software
        </Heading>
        <Input 
          type="text" 
          placeholder="Enter CPE or software name..." 
          value={query}
          onChange={handleQueryChange}
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
          autoFocus
        />
        <Button 
          type="submit" 
          colorScheme="blue" 
          isDisabled={!query.trim()}
          size="lg"
        >
          Search
        </Button>
      </VStack>
    </form>
  )
}
