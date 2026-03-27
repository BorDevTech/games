import type { Metadata, Viewport } from "next";
import { ChakraProviders } from "./providers";
import "./globals.css";

// Enhanced metadata following Next.js and SEO best practices
export const metadata: Metadata = {
  title: {
    default: "GameHub - Your Ultimate Gaming Destination",
    template: "%s | GameHub",
  },
  description: "Discover amazing games, connect with fellow gamers, and embark on epic adventures. Join millions of players in the most comprehensive gaming platform.",
  keywords: ["games", "gaming", "multiplayer", "online games", "arcade", "strategy", "action"],
  authors: [{ name: "GameHub Team" }],
  creator: "GameHub",
  publisher: "GameHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://games.bordevtech.com'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "GameHub - Your Ultimate Gaming Destination",
    description: "Discover amazing games, connect with fellow gamers, and embark on epic adventures.",
    siteName: "GameHub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GameHub - Your Ultimate Gaming Destination",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameHub - Your Ultimate Gaming Destination",
    description: "Discover amazing games, connect with fellow gamers, and embark on epic adventures.",
    images: ["/og-image.png"],
    creator: "@gamehub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
  },
};

// Enhanced viewport settings for better mobile experience
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#805ad5" },
    { media: "(prefers-color-scheme: dark)", color: "#b794f6" },
  ],
  colorScheme: "light dark",
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ChakraProviders>
          {children}
        </ChakraProviders>
        <noscript>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#f56565',
            color: 'white',
            padding: '1rem',
            textAlign: 'center',
            zIndex: 9999
          }}>
            JavaScript is required for the best gaming experience. Please enable JavaScript in your browser.
          </div>
        </noscript>
      </body>
    </html>
  );
}
