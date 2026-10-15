'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { GlobalTheme } from '@carbon/react';

export type ThemePreference = 'system' | 'light' | 'dark';
type CarbonTheme = 'white' | 'g100';

const STORAGE_KEY = 'proptyop.theme';
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
  };
}

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

type ThemeContextValue = {
  preference: ThemePreference;
  theme: CarbonTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * White by default, g100 for dark; follows prefers-color-scheme unless the user overrides it
 * (DESIGN_SYSTEM §3). Writes data-carbon-theme on <html> for the global token sets.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'system' as const);
  const systemDark = useSyncExternalStore(subscribe, prefersDark, () => false);
  const theme: CarbonTheme =
    preference === 'dark' || (preference === 'system' && systemDark) ? 'g100' : 'white';

  useEffect(() => {
    document.documentElement.dataset.carbonTheme = theme;
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <GlobalTheme theme={theme}>{children}</GlobalTheme>
    </ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemePreference must be used inside ThemeProvider');
  return context;
}
