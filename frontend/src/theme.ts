import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      'html, body': {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
      '*::placeholder': {
        color: props.colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400',
      },
      '*, *::before, *::after': {
        borderColor: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.200',
      }
    })
  },
  colors: {
    darkBg: {
      surface: '#1A202C', // dark gray for surfaces
      hover: '#2D3748',   // slightly lighter for hover states
      active: '#4A5568',  // even lighter for active states
    },
    tableCell: {
      dark: '#2D3748',    // medium gray for table cells in dark mode
      darkAlt: '#364154', // slightly different shade for alternating rows
    },
    // Custom green color scheme to ensure consistency
    green: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50', // Primary green color
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20',
    }
  },
  // Ensure all components change properly with colorMode
  components: {
    Modal: {
      baseStyle: (props: { colorMode: string }) => ({
        dialog: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          color: props.colorMode === 'dark' ? 'white' : 'gray.800',
        }
      })
    },
    Button: {
      baseStyle: (props: { colorMode: string }) => ({
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      })
    }
  }
})
