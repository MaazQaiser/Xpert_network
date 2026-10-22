'use client';

import { useEffect, useState } from 'react';
import { getControls, subscribeControls } from '@/mocks/controls';

/**
 * Presenter switch from prototype settings. Starts false so the first paint matches
 * the server, then follows the saved toggle.
 */
export function useDemoAutoplay(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(getControls().demoAutoplay);
    sync();
    return subscribeControls(sync);
  }, []);

  return on;
}
