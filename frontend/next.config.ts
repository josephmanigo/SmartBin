import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [],
  },

  // Tell Next.js (and Turbopack) NOT to bundle these — load them from node_modules at runtime.
  // firebase-admin pulls in @google-cloud/* packages that use native Node.js APIs
  // and @opentelemetry which breaks when bundled by Turbopack.
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@opentelemetry/api',
  ],
};

export default nextConfig;
