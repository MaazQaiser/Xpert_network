'use client';

import { useState } from 'react';
import { Button, ButtonSkeleton, InlineNotification, Modal, Stack } from '@carbon/react';
import { ArrowRight, UserAvatar } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import { useOAuthAccounts, useOAuthSignIn } from '../../api/mutations';
import type { OAuthProvider, OAuthResult, SignUpRole } from '../../model/session.schema';
import styles from './OAuthButtons.module.scss';

const PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'linkedin', label: 'LinkedIn' },
];

type OAuthButtonsProps = {
  /** Sign-up passes the chosen role; log-in passes null and keeps the account's role. */
  role: SignUpRole | null;
  onSuccess: (result: OAuthResult) => void;
};

/**
 * "Continue with Google / LinkedIn" (mocked, F0). Opens a stand-in for the provider's
 * account chooser so testers can pick an existing or a brand-new identity.
 */
export function OAuthButtons({ role, onSuccess }: OAuthButtonsProps) {
  const [provider, setProvider] = useState<OAuthProvider | null>(null);
  const accounts = useOAuthAccounts(provider);
  const signIn = useOAuthSignIn();
  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? '';

  const close = () => {
    setProvider(null);
    signIn.reset();
  };

  return (
    <>
      <div className={styles.buttons}>
        {PROVIDERS.map((p) => (
          <Button
            key={p.id}
            kind="tertiary"
            className={styles.provider}
            onClick={() => setProvider(p.id)}
          >
            Continue with {p.label}
          </Button>
        ))}
      </div>
      <Modal
        open={provider !== null}
        passiveModal
        size="sm"
        modalLabel={`${providerLabel} (prototype)`}
        modalHeading="Choose an account"
        onRequestClose={close}
      >
        <Stack gap={5}>
          <p className={styles.help}>
            to continue to Proptyop. In the real product this is {providerLabel}’s own screen.
          </p>
          {signIn.isError ? (
            <InlineNotification
              kind="error"
              title="Couldn’t continue"
              subtitle={toUserMessage(signIn.error)}
              lowContrast
              hideCloseButton
            />
          ) : null}
          {accounts.isPending ? (
            <>
              <ButtonSkeleton className={styles.account} />
              <ButtonSkeleton className={styles.account} />
            </>
          ) : accounts.isError ? (
            <ErrorState
              message={toUserMessage(accounts.error)}
              onRetry={() => void accounts.refetch()}
            />
          ) : (
            <ul className={styles.accounts} aria-label={`${providerLabel} accounts`}>
              {accounts.data.map((account) => (
                <li key={account.email}>
                  <Button
                    kind="ghost"
                    className={styles.account}
                    renderIcon={signIn.isPending ? undefined : ArrowRight}
                    disabled={signIn.isPending}
                    onClick={() =>
                      provider &&
                      signIn.mutate(
                        { provider, accountEmail: account.email, role },
                        { onSuccess: (result) => onSuccess(result) },
                      )
                    }
                  >
                    <UserAvatar size={20} aria-hidden="true" className={styles.avatar} />
                    <span className={styles.identity}>
                      <span className={styles.name}>{account.name}</span>
                      <span className={styles.email}>{account.email}</span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Modal>
    </>
  );
}
