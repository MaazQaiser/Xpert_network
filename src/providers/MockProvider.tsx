'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PageLoading } from '@/shared/ui';

// One worker per page, even when React mounts this provider twice (strict mode).
let workerReady: Promise<unknown> | null = null;

const START_OPTIONS = { onUnhandledFrame: 'bypass', quiet: true } as const;

function startMockWorker() {
  workerReady ??= import('@/mocks/browser').then(async ({ worker }) => {
    await worker.start(START_OPTIONS);
    // If the browser stops and restarts the idle service worker, it forgets this tab; the API
    // client calls this when a request falls through, to hand the tab back to the mocks.
    let recovering: Promise<void> | null = null;
    (
      globalThis as typeof globalThis & { __xnRecoverMocks?: () => Promise<void> }
    ).__xnRecoverMocks = () =>
      (recovering ??= (async () => {
        worker.stop();
        await worker.start(START_OPTIONS);
      })().finally(() => {
        recovering = null;
      }));
  });
  return workerReady;
}

/**
 * Starts the MSW worker (the prototype's backend) before rendering the app, so every
 * fetch to /api goes through src/mocks. Swap this out when a real API exists (ADR 0006).
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    void startMockWorker().then(() => {
      if (!isCancelled) setIsReady(true);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isReady) return <PageLoading description="Loading Xpert Network" />;
  return <>{children}</>;
}
