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
import {
  Close,
  ColorPalette,
  Debug,
  PauseFilled,
  PlayFilledAlt,
  Renew,
  Reset,
} from '@carbon/icons-react';
import { ROLE_HOME, useLogin, useSession, type PersonaId } from '@/features/auth';
import {
  DEFAULT_CONTROLS,
  getControls,
  PERSONA_SUMMARY,
  resetDemo,
  scenarios,
  setControls,
  subscribeControls,
  USERS,
  type CoverageScenario,
  type PrototypeControls,
} from '@/mocks';
import { routes } from '@/shared/config/routes';
import {
  getDemoChat,
  getDemoChatServerSnapshot,
  requestDemoChat,
  subscribeDemoChat,
  type DemoChatStatus,
} from '../../model/demoChat';
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

const CHAT_STATUS: Record<DemoChatStatus, string> = {
  away: 'Open a home brief to control its chat.',
  ready: 'The brief is empty. Play starts it one message at a time.',
  playing: 'The chat is playing.',
  paused: 'The chat is paused on the messages already on screen.',
  done: 'The chat has finished. Replay runs it again.',
};

/** Floating prototype controls (PRODUCT_PLAN §8). Only rendered when NEXT_PUBLIC_PROTOTYPE=true. */
export function PrototypeToolbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const login = useLogin();
  const [isOpen, setIsOpen] = useState(false);
  const controls = useSyncExternalStore(subscribeControls, getControls, () => DEFAULT_CONTROLS);
  const demoChat = useSyncExternalStore(subscribeDemoChat, getDemoChat, getDemoChatServerSnapshot);
  const chatOpen = demoChat.status !== 'away';
  const chatTransport =
    demoChat.status === 'playing'
      ? { label: 'Pause', icon: PauseFilled, action: 'pause' as const }
      : demoChat.status === 'paused'
        ? { label: 'Resume', icon: PlayFilledAlt, action: 'play' as const }
        : { label: 'Play', icon: PlayFilledAlt, action: 'play' as const };

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
  const currentRole = session.data?.user?.role ?? null;

  /** Scenario actions change mock data; refetch everything so the UI catches up. */
  const runScenario = (action: () => boolean) => {
    if (action()) void queryClient.invalidateQueries();
  };

  return (
    <Theme theme="g90" className={styles.root}>
      {isOpen ? (
        <section
          id="prototype-toolbar"
          className={styles.panel}
          aria-labelledby="prototype-toolbar-title"
        >
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
              itemToString={(id: PersonaId | null) =>
                id ? `${USERS[id].name} (${USERS[id].role})` : ''
              }
              helperText={
                currentPersona ? PERSONA_SUMMARY[currentPersona] : 'Pick a persona to log in'
              }
              onChange={({ selectedItem }: { selectedItem: PersonaId | null }) => {
                if (selectedItem) switchPersona(selectedItem);
              }}
              size="sm"
            />
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={ColorPalette}
              onClick={() => router.push(routes.designSystem)}
            >
              Design system
            </Button>
            <Toggle
              id="prototype-demo-autoplay"
              size="sm"
              labelText="Play on open"
              labelA="Off — the brief waits until you press Play"
              labelB="On — the brief types itself when opened"
              toggled={controls.demoAutoplay}
              onToggle={(checked: boolean) => update({ demoAutoplay: checked })}
            />
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Demo chat</legend>
              <p className={styles.hint}>{CHAT_STATUS[demoChat.status]}</p>
              <div className={styles.scenarios}>
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={chatTransport.icon}
                  disabled={!chatOpen || demoChat.status === 'done'}
                  onClick={() => requestDemoChat(chatTransport.action)}
                >
                  {chatTransport.label}
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={Renew}
                  disabled={!chatOpen}
                  onClick={() => requestDemoChat('replay')}
                >
                  Replay
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={Reset}
                  disabled={!chatOpen || demoChat.status === 'ready'}
                  onClick={() => requestDemoChat('reset')}
                >
                  Reset chat
                </Button>
              </div>
            </fieldset>
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
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Scenarios</legend>
              <div className={styles.scenarios}>
                <Button
                  kind="tertiary"
                  size="sm"
                  disabled={currentRole !== 'client' && currentRole !== 'expert'}
                  onClick={() => runScenario(scenarios.restartOnboarding)}
                >
                  Restart onboarding
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  disabled={currentRole !== 'expert'}
                  onClick={() => runScenario(() => scenarios.decideExpert('approved'))}
                >
                  Approve expert
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  disabled={currentRole !== 'expert'}
                  onClick={() => runScenario(() => scenarios.decideExpert('rejected'))}
                >
                  Reject expert
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  disabled={currentRole === null}
                  onClick={() => runScenario(scenarios.pushNotification)}
                >
                  Push notification
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  disabled={currentRole !== 'client'}
                  onClick={() => runScenario(scenarios.updateOwnedReport)}
                >
                  Update owned report
                </Button>
                {(
                  [
                    ['Advance request', scenarios.advanceRequest],
                    ['Revise quote', scenarios.reviseQuote],
                    ['Expire quote', scenarios.expireQuote],
                    ['Deliver partially', scenarios.deliverPartially],
                  ] as const
                ).map(([label, action]) => (
                  <Button
                    key={label}
                    kind="tertiary"
                    size="sm"
                    disabled={currentRole !== 'client'}
                    onClick={() => runScenario(action)}
                  >
                    {label}
                  </Button>
                ))}
                {(
                  [
                    ['Approve application', scenarios.approveApplication],
                    ['Drop connection', scenarios.dropConnection],
                    ['Pause 15 minutes', scenarios.pauseLong],
                    ['Accept interview', () => scenarios.decideInterview('accepted')],
                    ['Reject interview', () => scenarios.decideInterview('rejected')],
                    ['Payout paid', scenarios.payoutPaid],
                  ] as const
                ).map(([label, action]) => (
                  <Button
                    key={label}
                    kind="tertiary"
                    size="sm"
                    disabled={currentRole !== 'expert'}
                    onClick={() => runScenario(action)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
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
        hasIconOnly
        renderIcon={Debug}
        iconDescription={isOpen ? 'Hide prototype controls' : 'Prototype controls'}
        tooltipPosition="left"
        aria-expanded={isOpen}
        aria-controls="prototype-toolbar"
        onClick={() => setIsOpen((open) => !open)}
        className={styles.trigger}
      />
    </Theme>
  );
}
