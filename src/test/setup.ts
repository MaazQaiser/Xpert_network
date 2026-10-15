import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/node';
import { db } from '@/mocks/store/db';
import { resetControls } from '@/mocks/controls';

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
  db.reset();
  resetControls();
});
afterAll(() => server.close());
