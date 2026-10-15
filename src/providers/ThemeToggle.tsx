'use client';

import { HeaderGlobalAction } from '@carbon/react';
import { Asleep, Light } from '@carbon/icons-react';
import { useThemePreference } from './ThemeProvider';

/** Header action that flips between light (white) and dark (g100). */
export function ThemeToggle() {
  const { theme, setPreference } = useThemePreference();
  const isDark = theme === 'g100';
  return (
    <HeaderGlobalAction
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      tooltipAlignment="end"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Light size={20} /> : <Asleep size={20} />}
    </HeaderGlobalAction>
  );
}
