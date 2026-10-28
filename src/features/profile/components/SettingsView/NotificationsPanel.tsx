'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  Form,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  SkeletonText,
  Stack,
} from '@carbon/react';
import type { Role } from '@/features/auth';
import { ROLE_EVENTS } from '@/features/notifications';
import { toUserMessage } from '@/shared/api';
import { AsyncBoundary } from '@/shared/ui';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../api/queries';
import type { Digest, NotificationPreferences } from '../../model/profile.schema';
import styles from './Settings.module.scss';

const DIGESTS: { value: Digest; label: string }[] = [
  { value: 'instant', label: 'As it happens' },
  { value: 'daily', label: 'Daily summary (08:00)' },
  { value: 'weekly', label: 'Weekly summary (Sunday)' },
];

export function NotificationsPanel({ role }: { role: Exclude<Role, 'admin'> }) {
  const preferences = useNotificationPreferences();
  return (
    <section className={styles.section} aria-labelledby="notifications-heading">
      <div>
        <h2 id="notifications-heading" className={styles.sectionTitle}>
          What we notify you about
        </h2>
        <p className={styles.help}>
          Account and security emails are always sent. In-app notifications appear in the bell at
          the top of the page.
        </p>
      </div>
      <AsyncBoundary
        query={preferences}
        errorTitle="Couldn’t load your notification settings"
        loading={<SkeletonText paragraph lineCount={8} />}
      >
        {(data) => <PreferencesForm initial={data} role={role} />}
      </AsyncBoundary>
    </section>
  );
}

function PreferencesForm({
  initial,
  role,
}: {
  initial: NotificationPreferences;
  role: Exclude<Role, 'admin'>;
}) {
  const update = useUpdateNotificationPreferences();
  const [prefs, setPrefs] = useState(initial);
  const isDirty = JSON.stringify(prefs) !== JSON.stringify(update.data ?? initial);

  const channel = (event: string) => prefs.channels.find((c) => c.event === event);
  const toggle = (event: string, key: 'email' | 'inApp', checked: boolean) =>
    setPrefs((current) => ({
      ...current,
      channels: current.channels.map((c) => (c.event === event ? { ...c, [key]: checked } : c)),
    }));

  return (
    <Form
      noValidate
      aria-labelledby="notifications-heading"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(prefs);
      }}
    >
      <Stack gap={7}>
        {update.isSuccess && !isDirty ? (
          <InlineNotification
            kind="success"
            title="Notification settings saved"
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        {update.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t save"
            subtitle={`${toUserMessage(update.error)} Your choices are still here.`}
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        <div className={styles.events}>
          {ROLE_EVENTS[role].map(({ event, label, detail }) => {
            const current = channel(event);
            return (
              <div
                key={event}
                role="group"
                aria-labelledby={`pref-${event}-label`}
                aria-describedby={`pref-${event}-detail`}
                className={styles.event}
              >
                <div>
                  <p id={`pref-${event}-label`} className={styles.eventLabel}>
                    {label}
                  </p>
                  <p id={`pref-${event}-detail`} className={styles.eventDetail}>
                    {detail}
                  </p>
                </div>
                <div className={styles.channels}>
                  <Checkbox
                    id={`pref-${event}-email`}
                    labelText="Email"
                    checked={current?.email ?? false}
                    onChange={(_, { checked }) => toggle(event, 'email', checked)}
                  />
                  <Checkbox
                    id={`pref-${event}-inapp`}
                    labelText="In app"
                    checked={current?.inApp ?? false}
                    onChange={(_, { checked }) => toggle(event, 'inApp', checked)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <RadioButtonGroup
          legendText="How often to email you"
          name="digest"
          orientation="vertical"
          valueSelected={prefs.digest}
          onChange={(value) => setPrefs((current) => ({ ...current, digest: value as Digest }))}
        >
          {DIGESTS.map((d) => (
            <RadioButton
              key={d.value}
              id={`digest-${d.value}`}
              value={d.value}
              labelText={d.label}
            />
          ))}
        </RadioButtonGroup>
        <div className={styles.actions}>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            Save notification settings
          </Button>
        </div>
      </Stack>
    </Form>
  );
}
