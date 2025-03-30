import React from 'react'
import { ChakraProvider, Container, ColorModeScript, Box } from '@chakra-ui/react'
import { MultiStepForm } from './components/MultiStepForm.tsx'
import { AccessibilityMonitor } from './components/AccessibilityMonitor.tsx'
import MatrixRain from './components/MatrixRain.tsx'
import { theme } from './theme.ts'

function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme} resetCSS>
        <MatrixRain />
        <Box position="relative" zIndex={1} bg="transparent">
          <Container maxW="container.xl" py={10}>
            <MultiStepForm />
            <AccessibilityMonitor />
          </Container>
        </Box>
      </ChakraProvider>
    </>
  )
}

export default App
