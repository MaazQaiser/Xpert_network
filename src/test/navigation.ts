import { vi } from 'vitest';

/**
 * Shared `next/navigation` stand-in, mocked globally in setup.ts. The setup file loads the
 * MSW handlers (and through them, feature modules) before any test file, so per-file
 * `vi.mock('next/navigation')` calls would come too late.
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const mockLocation = { pathname: '/', search: '' };

export function resetNavigationMock() {
  Object.values(mockRouter).forEach((fn) => fn.mockReset());
  mockLocation.pathname = '/';
  mockLocation.search = '';
}
