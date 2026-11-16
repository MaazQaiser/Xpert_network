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
  // GetSales (LinkedIn), Scio (the AI assistant), the brief mailbox, briefs' requirements and people
  // searches come from the PoC backend, which holds the API keys. MSW has no browser handler for
  // them, so the calls pass through to Next.js and on to the backend (ADR 0016).
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8001';
    return [
      { source: '/api/getsales/:path*', destination: `${backend}/api/getsales/:path*` },
      { source: '/api/scio/:path*', destination: `${backend}/api/scio/:path*` },
      { source: '/api/mailbox/:path*', destination: `${backend}/api/mailbox/:path*` },
      { source: '/api/requirements/:path*', destination: `${backend}/api/requirements/:path*` },
      { source: '/api/searches', destination: `${backend}/api/searches` },
      { source: '/api/searches/:path*', destination: `${backend}/api/searches/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
