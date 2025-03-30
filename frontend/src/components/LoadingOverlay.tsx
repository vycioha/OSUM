import React from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
  <Box
    position="fixed"
    top={0}
    left={0}
    right={0}
    bottom={0}
    bg="blackAlpha.300"
    backdropFilter="blur(2px)"
    zIndex={9999}
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    <VStack spacing={4}>
      <Spinner size="xl" color="blue.500" thickness="4px" />
      <Text color="white" fontSize="lg" fontWeight="medium" textShadow="0 1px 2px rgba(0,0,0,0.4)">
        {message}
      </Text>
    </VStack>
  </Box>
);
