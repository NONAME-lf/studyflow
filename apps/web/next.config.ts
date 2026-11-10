import path from 'node:path';
import type { NextConfig } from 'next';

// Same-origin API: the browser calls /api/*, Next.js proxies it to NestJS,
// so the httpOnly refresh cookie works without CORS. Resolved at build time.
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
