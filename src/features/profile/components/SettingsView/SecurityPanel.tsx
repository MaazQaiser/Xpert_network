'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  InlineNotification,
  Modal,
  PasswordInput,
  SkeletonText,
  Stack,
  Tag,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Laptop, Logout, Mobile } from '@carbon/icons-react';
import { PasswordRules } from '@/features/auth';
import { toUserMessage } from '@/shared/api';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary } from '@/shared/ui';
import {
  useChangePassword,
  useSecurity,
  useSetTwoFactor,
  useSignOutOtherSessions,
  useSignOutSession,
} from '../../api/queries';
import {
  changePasswordFormSchema,
  twoFactorCodeSchema,
  type ChangePasswordFormValues,
  type Security,
  type TwoFactorCodeValues,
} from '../../model/profile.schema';
import styles from './Settings.module.scss';

/** F17 security (mocked): password, two-step verification, active sessions. */
export function SecurityPanel() {
  const security = useSecurity();
  return (
    <AsyncBoundary
      query={security}
      errorTitle="Couldn’t load your security settings"
      loading={<SkeletonText paragraph lineCount={8} />}
    >
      {(data) => (
        <>
          <PasswordSection security={data} />
          <TwoFactorSection security={data} />
          <SessionsSection security={data} />
        </>
      )}
    </AsyncBoundary>
  );
}

function PasswordSection({ security }: { security: Security }) {
  const [isOpen, setIsOpen] = useState(false);
  const change = useChangePassword();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  const close = () => {
    setIsOpen(false);
    reset();
  };

  return (
    <section className={styles.section} aria-labelledby="password-heading">
      <div>
        <h2 id="password-heading" className={styles.sectionTitle}>
          Password
        </h2>
        <p className={styles.help}>
          {security.passwordChangedAt ? (
            <>
              Last changed{' '}
              <time
                dateTime={security.passwordChangedAt}
                title={formatDateTime(security.passwordChangedAt)}
              >
                {formatRelative(security.passwordChangedAt)}
              </time>
              .
            </>
          ) : (
            'You haven’t changed your password since you signed up.'
          )}
        </p>
      </div>
      {change.isSuccess && !isOpen ? (
        <InlineNotification
          kind="success"
          title="Password changed"
          subtitle="Use your new password next time you log in."
          lowContrast
          onCloseButtonClick={() => change.reset()}
        />
      ) : null}
      {isOpen ? (
        <Form
          noValidate
          aria-label="Change password"
          onSubmit={handleSubmit(({ currentPassword, newPassword: next }) =>
            change.mutate({ currentPassword, newPassword: next }, { onSuccess: close }),
          )}
        >
          <Stack gap={6}>
            {change.isError ? (
              <InlineNotification
                kind="error"
                title="Couldn’t change your password"
                subtitle={toUserMessage(change.error)}
                lowContrast
                hideCloseButton
              />
            ) : null}
            <PasswordInput
              id="security-current"
              labelText="Current password"
              autoComplete="current-password"
              helperText="Prototype: any password works, except “wrong-password”."
              className={styles.field}
              invalid={Boolean(errors.currentPassword)}
              invalidText={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <div className={styles.field}>
              <PasswordInput
                id="security-new"
                labelText="New password"
                autoComplete="new-password"
                aria-describedby="security-new-rules"
                invalid={Boolean(errors.newPassword)}
                invalidText={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <PasswordRules id="security-new-rules" value={newPassword} />
            </div>
            <PasswordInput
              id="security-confirm"
              labelText="Repeat new password"
              autoComplete="new-password"
              className={styles.field}
              invalid={Boolean(errors.confirm)}
              invalidText={errors.confirm?.message}
              {...register('confirm')}
            />
            <div className={styles.actions}>
              <Button type="submit" disabled={change.isPending}>
                Change password
              </Button>
              <Button kind="ghost" onClick={close} disabled={change.isPending}>
                Cancel
              </Button>
            </div>
          </Stack>
        </Form>
      ) : (
        <div>
          <Button
            kind="tertiary"
            onClick={() => {
              change.reset();
              setIsOpen(true);
            }}
          >
            Change password
          </Button>
        </div>
      )}
    </section>
  );
}

function TwoFactorSection({ security }: { security: Security }) {
  const setTwoFactor = useSetTwoFactor();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TwoFactorCodeValues>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const close = () => {
    setIsSettingUp(false);
    setTwoFactor.reset();
    reset();
  };
  const confirm = handleSubmit(({ code }) =>
    setTwoFactor.mutate({ twoFactorEnabled: true, code }, { onSuccess: close }),
  );

  return (
    <section className={styles.section} aria-labelledby="two-factor-heading">
      <div>
        <h2 id="two-factor-heading" className={styles.sectionTitle}>
          Two-step verification
        </h2>
        <p className={styles.help}>
          Ask for a code from an authenticator app when you log in on a new device.
        </p>
      </div>
      <Toggle
        id="security-two-factor"
        labelText="Two-step verification"
        labelA="Off"
        labelB="On"
        toggled={security.twoFactorEnabled}
        disabled={setTwoFactor.isPending}
        onToggle={(checked) =>
          checked ? setIsSettingUp(true) : setTwoFactor.mutate({ twoFactorEnabled: false })
        }
      />
      {setTwoFactor.isError && !isSettingUp ? (
        <InlineNotification
          kind="error"
          title="Couldn’t update two-step verification"
          subtitle={toUserMessage(setTwoFactor.error)}
          lowContrast
          onCloseButtonClick={() => setTwoFactor.reset()}
        />
      ) : null}
      <Modal
        open={isSettingUp}
        modalHeading="Turn on two-step verification"
        modalLabel="Security"
        primaryButtonText="Turn on"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={setTwoFactor.isPending}
        onRequestClose={close}
        onRequestSubmit={() => void confirm()}
        size="sm"
      >
        <Stack gap={5}>
          <p className={styles.help}>
            Scan the QR code with an authenticator app, then enter the 6-digit code it shows.
            (Prototype: no QR code — any 6 digits work, except 000000.)
          </p>
          {setTwoFactor.isError ? (
            <InlineNotification
              kind="error"
              title="Code not accepted"
              subtitle={toUserMessage(setTwoFactor.error)}
              lowContrast
              hideCloseButton
            />
          ) : null}
          <TextInput
            id="security-code"
            labelText="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={styles.field}
            invalid={Boolean(errors.code)}
            invalidText={errors.code?.message}
            {...register('code')}
          />
        </Stack>
      </Modal>
    </section>
  );
}

function SessionsSection({ security }: { security: Security }) {
  const signOut = useSignOutSession();
  const signOutOthers = useSignOutOtherSessions();
  const others = security.sessions.filter((s) => !s.isCurrent);
  const error = signOut.error ?? signOutOthers.error;

  return (
    <section className={styles.section} aria-labelledby="sessions-heading">
      <div>
        <h2 id="sessions-heading" className={styles.sectionTitle}>
          Where you’re logged in
        </h2>
        <p className={styles.help}>
          Don’t recognise a device? Sign it out, then change your password.
        </p>
      </div>
      {error ? (
        <InlineNotification
          kind="error"
          title="Couldn’t sign that session out"
          subtitle={toUserMessage(error)}
          lowContrast
          onCloseButtonClick={() => {
            signOut.reset();
            signOutOthers.reset();
          }}
        />
      ) : null}
      <ul className={styles.sessions} aria-label="Active sessions">
        {security.sessions.map((session) => {
          const Icon = /iPhone|Android/.test(session.device) ? Mobile : Laptop;
          return (
            <li key={session.id} className={styles.session}>
              <div>
                <p className={styles.sessionDevice}>
                  <Icon size={16} aria-hidden="true" />
                  {session.device}
                  {session.isCurrent ? (
                    <Tag type="green" size="sm">
                      This device
                    </Tag>
                  ) : null}
                </p>
                <p className={styles.sessionMeta}>
                  {session.location} ·{' '}
                  {session.isCurrent ? (
                    'Active now'
                  ) : (
                    <>
                      Last active{' '}
                      <time
                        dateTime={session.lastActiveAt}
                        title={formatDateTime(session.lastActiveAt)}
                      >
                        {formatRelative(session.lastActiveAt)}
                      </time>
                    </>
                  )}
                </p>
              </div>
              {session.isCurrent ? null : (
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Logout}
                  disabled={signOut.isPending}
                  onClick={() => signOut.mutate(session.id)}
                >
                  Sign out <span className={styles.visuallyHidden}>{session.device}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length === 0 ? (
        <p className={styles.help}>No other active sessions.</p>
      ) : (
        <div className={styles.actions}>
          <Button
            kind="danger--tertiary"
            renderIcon={Logout}
            className={styles.wrappingButton}
            disabled={signOutOthers.isPending}
            onClick={() => signOutOthers.mutate()}
          >
            <span className={styles.wrappingLabel}>Sign out of all other sessions</span>
          </Button>
        </div>
      )}
    </section>
  );
}
