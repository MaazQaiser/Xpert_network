import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { db, USERS } from './mockBackend';
import type { PersonaId } from '@/features/auth';

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** Renders with a fresh query client; optionally logs in a persona in the mock store. */
export function renderWithProviders(ui: ReactElement, { persona }: { persona?: PersonaId } = {}) {
  if (persona) {
    db.update((draft) => {
      draft.sessionUserId = USERS[persona].id;
    });
  }
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...render(ui, { wrapper }) };
}
