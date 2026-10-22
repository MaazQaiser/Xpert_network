'use client';

import { lazy, Suspense } from 'react';

const Toolbar = lazy(() =>
  import('./PrototypeToolbar').then((mod) => ({ default: mod.PrototypeToolbar })),
);

/**
 * Loads the toolbar after the first paint. A static import pulls the mock store, which
 * seeds goal-chat, and goal-chat reads the autoplay flag from this feature.
 */
export function PrototypeToolbar() {
  return (
    <Suspense fallback={null}>
      <Toolbar />
    </Suspense>
  );
}
