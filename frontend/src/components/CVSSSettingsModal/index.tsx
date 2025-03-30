import React from 'react';
import { CVSSVersion } from '../../types/settings';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Switch,
  Select,
  VStack,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';

export interface CVSSSettings {
  showVectorString: boolean;
  sortBy: 'date' | 'rating';
  preferredVersion: CVSSVersion;
}

interface CVSSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CVSSSettings;
  onSettingsChange: (settings: CVSSSettings) => void;
}

export const CVSSSettingsModal: React.FC<CVSSSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>CVSS Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} pb={4}>
            <FormControl>
              <FormLabel>Show Vector String</FormLabel>
              <Switch
                isChecked={settings.showVectorString}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    showVectorString: e.target.checked,
                  })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>Sort Results By</FormLabel>
              <Select
                value={settings.sortBy}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    sortBy: e.target.value as 'date' | 'rating',
                  })
                }
              >
                <option value="date">Date</option>
                <option value="rating">CVSS Rating</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Preferred CVSS Version</FormLabel>
              <Select
                value={settings.preferredVersion}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    preferredVersion: e.target.value as CVSSVersion,
                  })
                }
              >
                <option value="4.0">CVSS v4.0</option>
                <option value="3.1">CVSS v3.1</option>
                <option value="3.0">CVSS v3.0</option>
                <option value="2.0">CVSS v2.0</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
