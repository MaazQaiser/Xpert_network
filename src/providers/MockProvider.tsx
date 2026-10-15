'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loading } from '@carbon/react';

/**
 * Starts the MSW worker (the prototype's backend) before rendering the app, so every
 * fetch to /api goes through src/mocks. Swap this out when a real API exists (ADR 0006).
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    void import('@/mocks/browser').then(async ({ worker }) => {
      await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
      if (!isCancelled) setIsReady(true);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isReady) return <Loading description="Loading Proptyop" withOverlay={false} />;
  return <>{children}</>;
}
