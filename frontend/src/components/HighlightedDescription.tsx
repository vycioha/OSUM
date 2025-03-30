import React from 'react';
import {
  Text,
  Box,
  VStack,
} from '@chakra-ui/react';
import { findRelevantVulnerabilityTypes } from '../utils/vulnerabilityTypes.ts';

interface HighlightedDescriptionProps {
  text: string;
  onVulnerabilityClick?: (type: string) => void;
  showTooltip?: boolean;
}

export const HighlightedDescription: React.FC<HighlightedDescriptionProps> = ({
  text,
  onVulnerabilityClick,
  showTooltip = true
}) => {
  const relevantTypes = findRelevantVulnerabilityTypes(text);

  if (relevantTypes.length === 0) {
    return <Text>{text}</Text>;
  }

  return (
    <VStack align="start" spacing={2}>
      <Text>{text}</Text>
      {showTooltip && relevantTypes.length > 0 && (
        <Box fontSize="sm" color="gray.600">
          Suggested vulnerability types:
          {relevantTypes.map((type, index) => (
            <Text
              key={index}
              as="span"
              color="blue.500"
              cursor="pointer"
              ml={2}
              onClick={() => onVulnerabilityClick?.(type)}
              _hover={{ textDecoration: 'underline' }}
            >
              {type}
            </Text>
          ))}
        </Box>
      )}
    </VStack>
  );
};
