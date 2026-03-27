"use client";

import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "@/lib/theme";

interface ChakraProvidersProps {
  children: React.ReactNode;
}

export function ChakraProviders({ children }: ChakraProvidersProps) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </>
  );
}