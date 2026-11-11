import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tree-shake Carbon's barrel exports (FRONTEND_STANDARDS §8).
  experimental: {
    optimizePackageImports: ['@carbon/react', '@carbon/icons-react', '@carbon/pictograms-react'],
  },
  sassOptions: {
    // Carbon's Sass emits deprecation warnings for newer Dart Sass; they're not actionable here.
    quietDeps: true,
  },
  turbopack: {
    resolveAlias: {
      // MSW's browser worker only exists in the browser; SSR gets a no-op stub (ADR 0006).
      '@/mocks/browser': {
        browser: './src/mocks/browser.ts',
        default: './src/mocks/browser.stub.ts',
      },
    },
  },
  // GetSales sender profiles come from the PoC backend, which holds the API key. MSW has no
  // browser handler for them, so the call passes through to Next.js and on to the backend.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8000';
    return [{ source: '/api/getsales/:path*', destination: `${backend}/api/getsales/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
