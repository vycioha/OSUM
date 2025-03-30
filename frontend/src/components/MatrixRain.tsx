import React, { useEffect, useRef, useState } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';

// Using the same key as UserBadge for consistency
const USER_ACHIEVEMENT_KEY = 'usr_xp_lvl';

/**
 * MatrixRain component renders a Matrix-style digital rain effect.
 * Only appears when the user has unlocked the "1337 h4x0r" badge.
 * The effect is a subtle background with green characters falling down the screen,
 * creating a hacker-like aesthetic.
 */
const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorMode } = useColorMode();
  const [hasAchievement, setHasAchievement] = useState(() => 
    localStorage.getItem(USER_ACHIEVEMENT_KEY) === '1'
  );
  
  // Listen for changes to the achievement status through various events
  useEffect(() => {
    const handleStorageChange = () => {
      const achievementStatus = localStorage.getItem(USER_ACHIEVEMENT_KEY) === '1';
      setHasAchievement(achievementStatus);
    };
    
    // Check on mount and when storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for direct custom events
    const handleAchievementEvent = () => {
      setTimeout(() => {
        const achievementStatus = localStorage.getItem(USER_ACHIEVEMENT_KEY) === '1';
        setHasAchievement(achievementStatus);
      }, 100); // Small delay to ensure localStorage is updated
    };
    
    // Listen for security events
    window.addEventListener('security_event', handleAchievementEvent);
    
    // Listen for direct badge unlock event - this is the most immediate trigger
    const handleBadgeUnlocked = (event: CustomEvent) => {
      if (event.detail?.type === 'matrix') {
        setHasAchievement(true);
      }
    };
    
    window.addEventListener('badge_unlocked', handleBadgeUnlocked as EventListener);
    document.addEventListener('visibilitychange', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('security_event', handleAchievementEvent);
      window.removeEventListener('badge_unlocked', handleBadgeUnlocked as EventListener);
      document.removeEventListener('visibilitychange', handleStorageChange);
    };
  }, []);
  
  // Setup and run the matrix animation
  useEffect(() => {
    // Don't run if no achievement
    if (!hasAchievement) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number | null = null;
    
    // Set canvas size to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Matrix characters (mix of numbers and letters)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charArray = chars.split('');
    
    // Font size and spacing
    const fontSize = 14;
    // Reduced density - space out columns more
    const columnSpacing = 20; // Previously was using fontSize (14)
    const columns = Math.ceil(canvas.width / columnSpacing);
    
    // Arrays to store column properties
    const drops: number[] = [];
    const speeds: number[] = [];
    const waves: number[] = [];
    const startTimes: number[] = [];
    const isActive: boolean[] = []; // Whether a column is currently active
    
    // Initialize arrays with more randomness
    for (let i = 0; i < columns; i++) {
      // Start some drops at random positions
      drops[i] = Math.random() > 0.7 ? Math.random() * (canvas.height * 0.2) : 0;
      
      // Much slower speeds
      speeds[i] = 0.3 + Math.random() * 0.4; // Random speed between 0.3 and 0.7
      
      // More random wave grouping
      waves[i] = Math.floor(Math.random() * 10); 
      
      // More spread out start times
      startTimes[i] = waves[i] * 300 + Math.random() * 2000; // Add up to 2 seconds of additional random delay
      
      // Only some columns are active at any time
      isActive[i] = Math.random() > 0.4;
    }
    
    let startTime = Date.now();
    let frameCount = 0;
    
    // Drawing function
    const draw = () => {
      frameCount++;
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      // Set semi-transparent background to create fade effect
      ctx.fillStyle = colorMode === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set the text color with gradient based on position
      const baseColor = colorMode === 'dark' ? '0, 255, 0' : '0, 128, 0';
      
      // Calculate the fade-out point (20% of canvas height)
      const fadeOutStart = canvas.height * 0.2;
      
      // Randomly activate/deactivate columns (less frequently to maintain continuity)
      if (frameCount % 120 === 0) { // Every ~2 seconds at 60fps
        for (let i = 0; i < columns; i++) {
          if (Math.random() > 0.8) {
            isActive[i] = !isActive[i];
          }
        }
      }
      
      // Draw the characters
      for (let i = 0; i < drops.length; i++) {
        // Skip inactive columns
        if (!isActive[i]) continue;
        
        // Wait for wave start time
        if (elapsed < startTimes[i]) continue;
        
        // Only draw characters with a certain probability
        if (Math.random() > 0.8) continue;
        
        // Generate random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Calculate base opacity based on position
        const progress = drops[i] / fadeOutStart;
        const opacity = Math.max(0, Math.min(0.2, 0.2 * (1 - progress))); // Max opacity of 0.2
        
        // Set the color with varying opacity
        ctx.fillStyle = `rgba(${baseColor}, ${opacity})`;
        ctx.font = `${fontSize}px monospace`;
        
        // Add slight randomness to x position for more natural effect
        const xPos = i * columnSpacing + (Math.random() * 2 - 1);
        ctx.fillText(char, xPos, drops[i]);
        
        // Move the drop down (slower)
        drops[i] += fontSize * speeds[i] * 0.5;
        
        // Reset drop to top when it reaches fade-out point
        if (drops[i] > fadeOutStart) {
          drops[i] = 0;
          // Occasionally deactivate the column after it resets
          if (Math.random() > 0.7) {
            isActive[i] = false;
            // Reactivate after a random delay
            setTimeout(() => {
              isActive[i] = true;
            }, 500 + Math.random() * 3000);
          }
        }
      }
    };
    
    // Animation loop with slower frame rate
    let lastFrameTime = 0;
    const frameDelay = 50; // ~20fps instead of 60fps
    
    const animate = (timestamp: number) => {
      // Check if user still has the achievement
      if (!hasAchievement) {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      
      // Throttle frame rate
      if (timestamp - lastFrameTime >= frameDelay) {
        lastFrameTime = timestamp;
        draw();
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation immediately
    animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [hasAchievement, colorMode]); // React to both achievement status and color mode changes
  
  // Don't render if no achievement
  if (!hasAchievement) {
    return null;
  }
  
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={0}
      pointerEvents="none"
      opacity={0.8}
      bg="transparent"
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </Box>
  );
};

export default MatrixRain; 