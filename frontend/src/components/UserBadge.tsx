import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Tooltip,
  Text,
  useColorMode
} from '@chakra-ui/react';

const USER_ACHIEVEMENT_KEY = 'usr_xp_lvl';

export const UserBadge: React.FC = () => {
  const { colorMode } = useColorMode();
  const [hasBadge, setHasBadge] = useState(false);
  const [text, setText] = useState('>_');
  const [showCursor, setShowCursor] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const animationRef = useRef<number | null>(null);
  const typingIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    const checkUserAchievement = () => {
      const achievementLevel = localStorage.getItem(USER_ACHIEVEMENT_KEY);
      setHasBadge(achievementLevel === '1');
    };
    
    checkUserAchievement();
    window.addEventListener('storage', checkUserAchievement);
    
    return () => {
      window.removeEventListener('storage', checkUserAchievement);
    };
  }, []);
  
  useEffect(() => {
    if (!hasBadge) return;
    
    const blinkInterval = setInterval(() => {
      if (!isTyping) {
        setShowCursor(prev => !prev);
      }
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, [hasBadge, isTyping]);
  
  useEffect(() => {
    if (!hasBadge) return;
    
    const runTypingAnimation = () => {
      setIsTyping(true);
      setText('>');
      
      const fullText = '1337 h4x0r';
      let currentIndex = 0;
      
      const typeNextChar = () => {
        if (currentIndex < fullText.length) {
          setText('>'+fullText.substring(0, currentIndex+1));
          currentIndex++;
          typingIntervalRef.current = window.setTimeout(typeNextChar, 150);
        } else {
          setIsTyping(false);
          animationRef.current = window.setTimeout(() => {
            setText('>_');
            animationRef.current = window.setTimeout(runTypingAnimation, 1500);
          }, 3000);
        }
      };
      
      typingIntervalRef.current = window.setTimeout(typeNextChar, 150);
    };
    
    animationRef.current = window.setTimeout(runTypingAnimation, 1000);
    
    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [hasBadge]);
  
  if (!hasBadge) return null;
  
  const width = text === '>_' ? '50px' : text === '>' ? '45px' : `${Math.max(90, text.length * 11)}px`;
  
  return (
    <Box
      position="absolute"
      left="calc(50% + 60px)"
      top="50%"
      transform="translateY(-50%)"
      zIndex="2"
    >
      <Tooltip
        label="1337 H4x0r Badge, feel free to brag about it on your resume!"
        aria-label="Terminal Expert Badge"
        placement="bottom"
        hasArrow
      >
        <Box
          display="flex"
          alignItems="center"
          py={0.5}
          px={3}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'green.800' : 'green.100'}
          color={colorMode === 'dark' ? 'green.200' : 'green.600'}
          border="1px solid"
          borderColor={colorMode === 'dark' ? 'green.600' : 'green.200'}
          cursor="pointer"
          width={width}
          minHeight="24px"
          transition="width 0.15s ease-out"
          whiteSpace="nowrap"
          overflow="visible"
          sx={{
            '@keyframes glow': {
              '0%': { boxShadow: colorMode === 'dark' ? '0 0 5px rgba(76, 175, 80, 0.5)' : '0 0 5px rgba(76, 175, 80, 0.3)' },
              '50%': { boxShadow: colorMode === 'dark' ? '0 0 10px rgba(76, 175, 80, 0.8)' : '0 0 10px rgba(76, 175, 80, 0.5)' },
              '100%': { boxShadow: colorMode === 'dark' ? '0 0 5px rgba(76, 175, 80, 0.5)' : '0 0 5px rgba(76, 175, 80, 0.3)' }
            },
            animation: 'glow 3s infinite'
          }}
          _hover={{
            bg: colorMode === 'dark' ? 'green.700' : 'green.200',
            transform: 'scale(1.05)'
          }}
        >
          <Text fontFamily="monospace" fontWeight="bold" whiteSpace="nowrap" fontSize="sm" lineHeight="1.2">
            {text}{isTyping || !showCursor ? '' : '_'}
          </Text>
        </Box>
      </Tooltip>
    </Box>
  );
}; 