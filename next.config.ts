import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages when STATIC_EXPORT=true
  ...(isStaticExport && {
    output: 'export',
    distDir: 'out'
  }),
  
  trailingSlash: true,
  
  images: {
    unoptimized: true
  }
};

export default nextConfig;
