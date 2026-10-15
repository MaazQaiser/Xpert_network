'use client';

import { useSyncExternalStore } from 'react';

/** Carbon 2x Grid breakpoints (DESIGN_SYSTEM §4.5). */
export const BREAKPOINTS = { sm: 320, md: 672, lg: 1056, xlg: 1312, max: 1584 } as const;

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useBreakpointUp(breakpoint: keyof typeof BREAKPOINTS): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}
