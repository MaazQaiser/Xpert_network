'use client';

import { useEffect } from 'react';
import { applyOverrides, reloadOverrides, STORAGE_KEY } from '../../model/overrides';

/**
 * Applies the token edits saved from the design system page to every screen, and picks up
 * edits made in other tabs. Renders nothing.
 */
export function DesignTokenOverrides() {
  useEffect(() => {
    applyOverrides();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) reloadOverrides();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
