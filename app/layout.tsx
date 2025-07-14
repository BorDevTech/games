import type { Metadata } from "next";
import { ChakraProvider } from "@chakra-ui/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameHub - Your Ultimate Gaming Destination",
  description: "Discover amazing games, connect with fellow gamers, and embark on epic adventures at GameHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          {children}
        </ChakraProvider>
      </body>
    </html>
  );
}
