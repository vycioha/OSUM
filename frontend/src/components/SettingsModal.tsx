import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  Button,
  VStack,
  Text,
  useToast,
  Divider,
  Box,
  Select,
  FormControl,
  FormLabel,
  useColorMode,
  Link,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { CVSSVersion } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { colorMode } = useColorMode();
  const [apiKey, setApiKey] = useState(localStorage.getItem('nvd_api_key') || '');
  const [settings, setSettings] = useState({
    cvss: {
      preferredVersion: localStorage.getItem('preferred_cvss_version') || '3.1' as CVSSVersion,
      showVectorString: localStorage.getItem('show_vector_string') !== 'false' // default to true
    },
    cpe: {
      fetchLimit: parseInt(localStorage.getItem('cpe_fetch_limit') || '100', 10)
    }
  });
  const toast = useToast();

  const handleSave = () => {
    localStorage.setItem('nvd_api_key', apiKey);
    localStorage.setItem('preferred_cvss_version', settings.cvss.preferredVersion);
    localStorage.setItem('show_vector_string', settings.cvss.showVectorString.toString());
    localStorage.setItem('cpe_fetch_limit', settings.cpe.fetchLimit.toString());
    toast({
      title: 'Settings Saved',
      status: 'success',
      duration: 3000,
    });
    onClose();
  };

  const handleVersionChange = (version: string) => {
    setSettings(prev => ({
      ...prev,
      cvss: { ...prev.cvss, preferredVersion: version as CVSSVersion }
    }));
  };

  const handleCPELimitChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setSettings(prev => ({
      ...prev,
      cpe: { ...prev.cpe, fetchLimit: numValue }
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold">NVD API Settings</Text>
            <Input
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
            />
            <Box 
              bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
              p={4} 
              borderRadius="md" 
              borderLeft="4px" 
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
            >
              <Text fontStyle="italic" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'} fontSize="sm">
                Without an API key, you may make a number of queries equal to the public rate limits posted at{' '}
                <Link 
                  color="blue.500" 
                  href="https://nvd.nist.gov/developers" 
                  target="_blank" 
                  textDecoration="underline"
                  isExternal
                >
                  nvd.nist.gov/developers
                </Link>
                . More than the public rate limit requires that you register for an API key. 
                The key will become part of your data request. Keys should not be used by, or shared with, 
                individuals or organizations other than the original requestor.
              </Text>
              <Box mt={2} fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'inherit'}>
                Source:{' '}
                <Link 
                  color="blue.500" 
                  href="https://nvd.nist.gov/developers/terms-of-use" 
                  target="_blank" 
                  textDecoration="underline"
                  isExternal
                >
                  NVD Terms of Use
                </Link>
              </Box>
            </Box>
            <Box fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'inherit'}>
              To request an API key, visit:{' '}
              <Link 
                color="blue.500" 
                href="https://nvd.nist.gov/developers/request-an-api-key" 
                target="_blank" 
                textDecoration="underline"
                isExternal
              >
                nvd.nist.gov/developers/request-an-api-key
              </Link>
            </Box>
            <Divider my={2} />
            <Text fontWeight="bold">CVSS Settings</Text>
            <FormControl>
              <FormLabel>Preferred CVSS Version</FormLabel>
              <Select
                value={settings.cvss.preferredVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
              >
                <option value="4.0">CVSS v4.0</option>
                <option value="3.1">CVSS v3.1</option>
                <option value="3.0">CVSS v3.0</option>
                <option value="2.0">CVSS v2.0</option>
              </Select>
              <Box 
                mt={2}
                p={3} 
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                borderRadius="md" 
                borderLeft="4px" 
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
              >
                <Box fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                  <Text fontWeight="bold" mb={1}>Version Fallback Order:</Text>
                  If the preferred version is not available, the system will try versions in this order:
                  <Box 
                    mt={1} 
                    fontFamily="monospace" 
                    bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                    color={colorMode === 'dark' ? 'blue.300' : 'inherit'}
                    p={2} 
                    borderRadius="md"
                    display="inline-block"
                  >
                    {settings.cvss.preferredVersion} {'>'}
                    {settings.cvss.preferredVersion === '4.0' ? ' 3.1 > 3.0 > 2.0' :
                     settings.cvss.preferredVersion === '3.1' ? ' 3.0 > 4.0 > 2.0' :
                     settings.cvss.preferredVersion === '3.0' ? ' 3.1 > 4.0 > 2.0' :
                     ' 3.1 > 3.0 > 4.0'}
                  </Box>
                </Box>
              </Box>
            </FormControl>
            <Divider my={2} />
            <Text fontWeight="bold">CPE Settings</Text>
            <FormControl>
              <FormLabel>Number of CPEs to Fetch</FormLabel>
              <NumberInput
                min={1}
                max={10000}
                value={settings.cpe.fetchLimit}
                onChange={handleCPELimitChange}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Box 
                mt={2}
                p={3} 
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                borderRadius="md" 
                borderLeft="4px" 
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
              >
                <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                  Set the maximum number of CPEs to fetch in a single query. Higher values may increase loading time but will show more results.
                </Text>
              </Box>
            </FormControl>
            <Divider my={2} />
            <Button colorScheme="blue" onClick={handleSave} width="full">
              Save Settings
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
