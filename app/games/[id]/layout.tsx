import { ReactNode } from 'react';

// Generate static params for static export
export function generateStaticParams() {
  return [
    { id: '01' },
    // Add more game IDs as they are implemented
  ];
}

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default function GameLayout({ children }: LayoutProps) {
  return <>{children}</>;
}