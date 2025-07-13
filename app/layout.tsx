import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Games",
  description: "A games application built with Next.js 15.3.5 and TypeScript",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
