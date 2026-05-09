import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [],
  },

  // Tell Next.js (and Turbopack) NOT to bundle these — load them from node_modules at runtime.
  serverExternalPackages: [
    '@opentelemetry/api',
  ],
};

export default nextConfig;
