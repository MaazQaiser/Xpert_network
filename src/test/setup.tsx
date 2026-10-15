import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/node';
import { db } from '@/mocks/store/db';
import { resetControls } from '@/mocks/controls';
import { mockLocation, mockRouter, resetNavigationMock } from './navigation';

// Carbon Charts draws with SVG APIs jsdom lacks; tests get a labelled stand-in instead.
vi.mock('@carbon/charts-react', () => ({
  SimpleBarChart: ({ options }: { options: { title?: string } }) => (
    <div role="img" aria-label={options.title ?? 'Chart'} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockLocation.pathname,
  useSearchParams: () => new URLSearchParams(mockLocation.search),
}));

// jsdom gaps that Carbon relies on.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
Element.prototype.scrollIntoView ??= () => undefined;

// MSW serves relative /api URLs in Node via this base.
const BASE = 'http://localhost';
const realFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  realFetch(typeof input === 'string' && input.startsWith('/') ? `${BASE}${input}` : input, init);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigationMock();
  db.reset();
  resetControls();
});
afterAll(() => server.close());
