import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and tesseract.js use Node.js APIs that must be excluded from webpack bundling
  serverExternalPackages: ['pdf-parse', 'tesseract.js'],
  
  // Increase serverless function timeout for OCR + Claude pipeline
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB file uploads
    },
  },
};

export default nextConfig;
