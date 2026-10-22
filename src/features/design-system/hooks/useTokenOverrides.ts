'use client';

import { useSyncExternalStore } from 'react';
import {
  getOverrides,
  getServerOverrides,
  subscribeOverrides,
  type TokenOverrides,
} from '../model/overrides';

export function useTokenOverrides(): TokenOverrides {
  return useSyncExternalStore(subscribeOverrides, getOverrides, getServerOverrides);
}

function subscribeRootStyle(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-carbon-theme'],
  });
  const unsubscribe = subscribeOverrides(listener);
  return () => {
    observer.disconnect();
    unsubscribe();
  };
}

/** The live value of a custom property on <html>, refreshed on theme switches and edits. */
export function useTokenValue(name: string): string {
  return useSyncExternalStore(
    subscribeRootStyle,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => '',
  );
}
