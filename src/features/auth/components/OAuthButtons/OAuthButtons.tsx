'use client';

import { useState } from 'react';
import { Button, InlineNotification, Modal, SkeletonText, Stack } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import { useOAuthAccounts, useOAuthSignIn } from '../../api/mutations';
import type { OAuthProvider, OAuthResult, SignUpRole } from '../../model/session.schema';
import { AccountList } from '../AccountList/AccountList';
import { BrandLogo } from '../BrandLogo/BrandLogo';
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
            <span className={styles.providerContent}>
              <BrandLogo provider={p.id} />
              Continue with {p.label}
            </span>
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
            {provider ? <BrandLogo provider={provider} size={16} /> : null}
            <span>
              Continue to Proptyop. In the real product this is {providerLabel}’s own screen.
            </span>
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
            <SkeletonText paragraph lineCount={4} />
          ) : accounts.isError ? (
            <ErrorState
              message={toUserMessage(accounts.error)}
              onRetry={() => void accounts.refetch()}
            />
          ) : (
            <AccountList
              label={`${providerLabel} accounts`}
              items={accounts.data.map((a) => ({ id: a.email, name: a.name, detail: a.email }))}
              disabled={signIn.isPending}
              onSelect={(email) =>
                provider &&
                signIn.mutate(
                  { provider, accountEmail: email, role },
                  { onSuccess: (result) => onSuccess(result) },
                )
              }
            />
          )}
        </Stack>
      </Modal>
    </>
  );
}
