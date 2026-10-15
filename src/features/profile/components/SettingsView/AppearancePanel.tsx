'use client';

import { RadioButton, RadioButtonGroup } from '@carbon/react';
import { useThemePreference, type ThemePreference } from '@/providers/ThemeProvider';
import styles from './Settings.module.scss';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** F17 theme preference (DESIGN_SYSTEM §3): white or g100, or follow the OS. */
export function AppearancePanel() {
  const { preference, setPreference } = useThemePreference();
  return (
    <section className={styles.section} aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className={styles.sectionTitle}>
        Theme
      </h2>
      <RadioButtonGroup
        legendText="Colour theme"
        name="theme"
        orientation="vertical"
        valueSelected={preference}
        onChange={(value) => setPreference(value as ThemePreference)}
        helperText="Saved on this device. The header button switches between light and dark too."
      >
        {OPTIONS.map((option) => (
          <RadioButton
            key={option.value}
            id={`theme-${option.value}`}
            value={option.value}
            labelText={option.label}
          />
        ))}
      </RadioButtonGroup>
    </section>
  );
}
