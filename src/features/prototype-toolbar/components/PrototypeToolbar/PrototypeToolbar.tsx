'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Dropdown,
  RadioButton,
  RadioButtonGroup,
  Stack,
  Theme,
  Toggle,
} from '@carbon/react';
import { Close, Debug, Reset } from '@carbon/icons-react';
import { ROLE_HOME, useLogin, useSession, type PersonaId } from '@/features/auth';
import {
  DEFAULT_CONTROLS,
  getControls,
  PERSONA_SUMMARY,
  resetDemo,
  setControls,
  subscribeControls,
  USERS,
  type CoverageScenario,
  type PrototypeControls,
} from '@/mocks';
import styles from './PrototypeToolbar.module.scss';

type ToggleKey = 'slowNetwork' | 'apiError' | 'emptyData' | 'lowCredits' | 'micDenied';

const TOGGLES: { key: ToggleKey; label: string; helper: string }[] = [
  { key: 'slowNetwork', label: 'Slow network', helper: 'Shows skeletons and progress' },
  { key: 'apiError', label: 'API error', helper: 'Requests fail; AI replies drop mid-stream' },
  { key: 'emptyData', label: 'Empty data', helper: 'Lists and the library come back empty' },
  { key: 'lowCredits', label: 'Low credits', helper: 'Caps the wallet at 15 credits' },
  { key: 'micDenied', label: 'Mic denied', helper: 'Voice interviews fall back to text' },
];

const PERSONA_IDS = Object.keys(USERS) as PersonaId[];

/** Floating prototype controls (PRODUCT_PLAN §8). Only rendered when NEXT_PUBLIC_PROTOTYPE=true. */
export function PrototypeToolbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const login = useLogin();
  const [isOpen, setIsOpen] = useState(false);
  const controls = useSyncExternalStore(subscribeControls, getControls, () => DEFAULT_CONTROLS);

  const update = (patch: Partial<PrototypeControls>) => {
    setControls(patch);
    void queryClient.invalidateQueries();
  };

  const switchPersona = (personaId: PersonaId) => {
    login.mutate(
      { personaId },
      { onSuccess: (next) => next.user && router.push(ROLE_HOME[next.user.role]) },
    );
  };

  const currentPersona = session.data?.user?.personaId ?? null;

  return (
    <Theme theme="g90" className={styles.root}>
      {isOpen ? (
        <section id="prototype-toolbar" className={styles.panel} aria-labelledby="prototype-toolbar-title">
          <div className={styles.header}>
            <h2 id="prototype-toolbar-title" className={styles.title}>
              Prototype controls
            </h2>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={Close}
              iconDescription="Close prototype controls"
              tooltipPosition="left"
              onClick={() => setIsOpen(false)}
            />
          </div>
          <Stack gap={6}>
            <Dropdown
              id="prototype-persona"
              titleText="Persona"
              label="Not logged in"
              items={PERSONA_IDS}
              selectedItem={currentPersona}
              itemToString={(id: PersonaId | null) => (id ? `${USERS[id].name} (${USERS[id].role})` : '')}
              helperText={currentPersona ? PERSONA_SUMMARY[currentPersona] : 'Pick a persona to log in'}
              onChange={({ selectedItem }: { selectedItem: PersonaId | null }) => {
                if (selectedItem) switchPersona(selectedItem);
              }}
              size="sm"
            />
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>States</legend>
              {TOGGLES.map((toggle) => (
                <Toggle
                  key={toggle.key}
                  id={`prototype-${toggle.key}`}
                  size="sm"
                  labelText={toggle.label}
                  labelA={toggle.helper}
                  labelB={toggle.helper}
                  toggled={controls[toggle.key]}
                  onToggle={(checked: boolean) => update({ [toggle.key]: checked })}
                />
              ))}
            </fieldset>
            <RadioButtonGroup
              legendText="Library coverage (goal chat)"
              name="prototype-coverage"
              orientation="vertical"
              valueSelected={controls.coverage}
              onChange={(value) => update({ coverage: value as CoverageScenario })}
            >
              <RadioButton id="coverage-auto" value="auto" labelText="Realistic mix" />
              <RadioButton id="coverage-all" value="all" labelText="All questions covered" />
              <RadioButton id="coverage-none" value="none" labelText="Nothing covered" />
            </RadioButtonGroup>
            <Button
              kind="danger--tertiary"
              size="sm"
              renderIcon={Reset}
              onClick={() => {
                resetDemo();
                queryClient.clear();
                router.push('/');
              }}
            >
              Reset demo
            </Button>
          </Stack>
        </section>
      ) : null}
      <Button
        kind="secondary"
        size="md"
        renderIcon={Debug}
        aria-expanded={isOpen}
        aria-controls="prototype-toolbar"
        onClick={() => setIsOpen((open) => !open)}
        className={styles.trigger}
      >
        Prototype
      </Button>
    </Theme>
  );
}
