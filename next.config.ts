import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'output: export' doesn't support API routes
  // Remove this line to enable API routes for webhooks
  // output: 'export',
  
  // Only apply trailing slash to non-API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  images: {
    unoptimized: true
  }
};

export default nextConfig;
