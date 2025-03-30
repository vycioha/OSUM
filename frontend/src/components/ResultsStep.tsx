import React from 'react';
import { Box, Table, Tbody, Td, Th, Thead, Tr, Tag, TagLabel, TagLeftIcon, useColorMode } from '@chakra-ui/react';
import { IoAddCircleOutline, IoCloseCircleOutline } from 'react-icons/io5';

interface ResultsStepProps {
  selectedItems: {
    software: string;
    cveId: string;
    description: string;
    cvssScore: number | null;
    cvssVersion: string;
    vectorString: string;
  }[];
  cvssSettings: {
    showVectorString: boolean;
  };
  onSettingsChange: () => void;
  onAddMore: () => void;
  onAddHoverChange: (isHovered: boolean) => void;
  onLoadingChange: (isLoading: boolean, message: string) => void;
  showHistory: boolean;
  onHistoryChange: (value: boolean) => void;
  showSummary: boolean;
  onSummaryChange: (value: boolean) => void;
  minimalMode: boolean;
  isAppending?: boolean;
}

const getCVSSColor = (score: number | null) => {
  if (score === null) return 'gray.200';
  if (score >= 9) return 'red.600';
  if (score >= 7) return 'orange.500';
  if (score >= 4) return 'yellow.500';
  return 'green.500';
};

export const ResultsStep: React.FC<ResultsStepProps> = ({
  selectedItems,
  cvssSettings,
  onSettingsChange,
  onAddMore,
  onAddHoverChange,
  onLoadingChange,
  showHistory,
  onHistoryChange,
  showSummary,
  onSummaryChange,
  minimalMode,
  isAppending = false
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Software</Th>
            <Th>CVE ID</Th>
            <Th>Description</Th>
            <Th>CVSS Score</Th>
            <Th>CVSS Version</Th>
            <Th>Vector String</Th>
          </Tr>
        </Thead>
        <Tbody>
          {selectedItems.map((cve, index) => (
            <Tr key={index}>
              <Td>{cve.software}</Td>
              <Td>{cve.cveId}</Td>
              <Td>{cve.description}</Td>
              <Td
                borderWidth="1px"
                p={4}
                bg={cvssSettings.showVectorString ? getCVSSColor(cve.cvssScore) : undefined}
                data-cvss="true" // Add this attribute to preserve text color
              >
                {cve.cvssScore}
              </Td>
              <Td>{cve.cvssVersion}</Td>
              <Td>{cve.vectorString}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Tag
        colorScheme={isAppending ? "red" : "blue"}
        cursor="pointer"
        size="md"
        variant="outline"
        bgColor={isAppending 
          ? colorMode === "light" ? "red.50" : "red.900" 
          : colorMode === "light" ? "blue.50" : "blue.900"}
        borderColor={isAppending
          ? colorMode === "light" ? "red.200" : "red.700"
          : colorMode === "light" ? "blue.200" : "blue.700"}
        onClick={onAddMore}
        onMouseEnter={() => onAddHoverChange(true)}
        onMouseLeave={() => onAddHoverChange(false)}
      >
        <TagLeftIcon as={isAppending ? IoCloseCircleOutline : IoAddCircleOutline} />
        <TagLabel>{isAppending ? "Cancel Add" : "Add More"}</TagLabel>
      </Tag>
    </Box>
  );
};