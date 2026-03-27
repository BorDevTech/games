import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

// Theme configuration for color mode
const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
  disableTransitionOnChange: false,
};

// Custom color palette following Chakra UI best practices
const colors = {
  brand: {
    50: "#f7fafc",
    100: "#edf2f7", 
    200: "#e2e8f0",
    300: "#cbd5e0",
    400: "#a0aec0",
    500: "#805ad5", // Primary brand color
    600: "#6b46c1",
    700: "#553c9a",
    800: "#44337a",
    900: "#322659",
  },
  accent: {
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8", 
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#ec4899", // Accent color
    600: "#db2777",
    700: "#be185d",
    800: "#9d174d",
    900: "#831843",
  },
  success: {
    50: "#f0fff4",
    100: "#c6f6d5",
    500: "#38a169",
    600: "#2f855a",
  },
  error: {
    50: "#fed7d7",
    100: "#feb2b2",
    500: "#e53e3e",
    600: "#c53030",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#d69e2e", 
    600: "#b7791f",
  },
};

// Typography scale following web standards
const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  mono: `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
};

// Font sizes following design system principles
const fontSizes = {
  xs: "0.75rem",   // 12px
  sm: "0.875rem",  // 14px
  md: "1rem",      // 16px
  lg: "1.125rem",  // 18px
  xl: "1.25rem",   // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem",  // 36px
  "5xl": "3rem",     // 48px
  "6xl": "3.75rem",  // 60px
  "7xl": "4.5rem",   // 72px
  "8xl": "6rem",     // 96px
  "9xl": "8rem",     // 128px
};

// Spacing scale for consistent layout
const space = {
  px: "1px",
  0.5: "0.125rem", // 2px
  1: "0.25rem",    // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem",     // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem",    // 12px
  3.5: "0.875rem", // 14px
  4: "1rem",       // 16px
  5: "1.25rem",    // 20px
  6: "1.5rem",     // 24px
  7: "1.75rem",    // 28px
  8: "2rem",       // 32px
  9: "2.25rem",    // 36px
  10: "2.5rem",    // 40px
  12: "3rem",      // 48px
  14: "3.5rem",    // 56px
  16: "4rem",      // 64px
  20: "5rem",      // 80px
  24: "6rem",      // 96px
  28: "7rem",      // 112px
  32: "8rem",      // 128px
  36: "9rem",      // 144px
  40: "10rem",     // 160px
  44: "11rem",     // 176px
  48: "12rem",     // 192px
  52: "13rem",     // 208px
  56: "14rem",     // 224px
  60: "15rem",     // 240px
  64: "16rem",     // 256px
  72: "18rem",     // 288px
  80: "20rem",     // 320px
  96: "24rem",     // 384px
};

// Component style overrides for better accessibility and design
const components = {
  Button: {
    baseStyle: {
      fontWeight: "semibold",
      borderRadius: "md",
      _focus: {
        boxShadow: "0 0 0 2px var(--chakra-colors-brand-500)",
        outline: "none",
      },
      _focusVisible: {
        boxShadow: "0 0 0 2px var(--chakra-colors-brand-500)",
        outline: "none",
      },
    },
    variants: {
      solid: {
        _hover: {
          transform: "translateY(-1px)",
          boxShadow: "lg",
          _disabled: {
            transform: "none",
            boxShadow: "none",
          },
        },
        _active: {
          transform: "translateY(0)",
        },
      },
      outline: {
        _hover: {
          transform: "translateY(-1px)",
          boxShadow: "md",
          _disabled: {
            transform: "none",
            boxShadow: "none",
          },
        },
      },
    },
    sizes: {
      sm: {
        h: "32px",
        minW: "32px",
        fontSize: "sm",
        px: 3,
      },
      md: {
        h: "40px", 
        minW: "40px",
        fontSize: "md",
        px: 4,
      },
      lg: {
        h: "48px",
        minW: "48px",
        fontSize: "lg",
        px: 6,
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderRadius: "lg",
        overflow: "hidden",
        _hover: {
          transform: "translateY(-2px)",
          boxShadow: "xl",
        },
        transition: "all 0.2s ease-in-out",
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        _focus: {
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        },
        _focusVisible: {
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        },
      },
    },
  },
  Link: {
    baseStyle: {
      _focus: {
        boxShadow: "0 0 0 2px var(--chakra-colors-brand-500)",
        outline: "none",
        borderRadius: "sm",
      },
      _focusVisible: {
        boxShadow: "0 0 0 2px var(--chakra-colors-brand-500)",
        outline: "none",
        borderRadius: "sm",
      },
    },
  },
  Heading: {
    baseStyle: {
      fontWeight: "bold",
      lineHeight: "shorter",
    },
  },
  Text: {
    baseStyle: {
      lineHeight: "base",
    },
  },
};

// Global styles for better accessibility and performance
const styles = {
  global: (props: { colorMode: 'light' | 'dark' }) => ({
    "html": {
      scrollBehavior: "smooth",
      fontSize: "16px", // Ensure 16px base font size for accessibility
    },
    "body": {
      bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
      color: props.colorMode === "dark" ? "whiteAlpha.900" : "gray.800",
      lineHeight: "1.6",
      fontFeatureSettings: `"kern" 1, "liga" 1, "calt" 1`,
      textRendering: "optimizeLegibility",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    "*": {
      boxSizing: "border-box",
    },
    "*:focus": {
      outline: "2px solid transparent",
      outlineOffset: "2px",
    },
    // Skip link styles for accessibility
    ".skip-link": {
      position: "absolute",
      top: "-100px", 
      left: "0",
      bg: "brand.600",
      color: "white",
      p: 3,
      zIndex: 1000,
      textDecoration: "none",
      _focus: {
        top: 0,
      },
    },
    // Reduced motion support
    "@media (prefers-reduced-motion: reduce)": {
      "*": {
        animationDuration: "0.01ms !important",
        animationIterationCount: "1 !important", 
        transitionDuration: "0.01ms !important",
        scrollBehavior: "auto !important",
      },
    },
    // High contrast mode support
    "@media (prefers-contrast: high)": {
      "*": {
        borderColor: props.colorMode === "dark" ? "white" : "black",
      },
    },
  }),
};

// Breakpoints for responsive design
const breakpoints = {
  base: "0em",     // 0px
  sm: "30em",      // 480px
  md: "48em",      // 768px
  lg: "62em",      // 992px
  xl: "80em",      // 1280px
  "2xl": "96em",   // 1536px
};

// Create and export the theme
const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  space,
  components,
  styles,
  breakpoints,
  // Additional theme customizations
  shadows: {
    outline: "0 0 0 2px var(--chakra-colors-brand-500)",
  },
  radii: {
    none: "0",
    sm: "0.125rem",
    base: "0.25rem", 
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
});

export default theme;