'use client';

import type { ReactNode } from 'react';
import { MockProvider } from './MockProvider';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MockProvider>
        <QueryProvider>{children}</QueryProvider>
      </MockProvider>
    </ThemeProvider>
  );
}
