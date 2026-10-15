'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  InlineNotification,
  SkeletonPlaceholder,
  SkeletonText,
  Stack,
} from '@carbon/react';
import { ArrowRight, Email } from '@carbon/icons-react';
import { MailVerse } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { useResendVerification, useVerifyEmail } from '../../api/mutations';
import { useLogout } from '../../api/useLogin';
import { useSession } from '../../api/useSession';
import { ROLE_HOME, ROLE_ONBOARDING, type User } from '../../model/session.schema';
import styles from './VerifyEmailNotice.module.scss';

function nextRoute(user: User) {
  return user.role === 'admin' ? ROLE_HOME.admin : ROLE_ONBOARDING[user.role];
}

/** F0 "Check your inbox" notice after email sign-up. */
export function VerifyEmailNotice() {
  const session = useSession();

  if (session.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading">
        <SkeletonPlaceholder className={styles.pictogram} />
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }
  if (session.isError) {
    return (
      <ErrorState message={toUserMessage(session.error)} onRetry={() => void session.refetch()} />
    );
  }
  const user = session.data.user;
  if (!user) {
    return (
      <Stack gap={5}>
        <p className={styles.body}>Log in to finish verifying your email.</p>
        <div>
          <Button as={Link} href={routes.login} renderIcon={ArrowRight}>
            Log in
          </Button>
        </div>
      </Stack>
    );
  }
  return user.emailVerified ? <Verified user={user} /> : <Pending user={user} />;
}

function Verified({ user }: { user: User }) {
  return (
    <Stack gap={5}>
      <p className={styles.body}>Your email {user.email} is verified.</p>
      <div>
        <Button as={Link} href={nextRoute(user)} renderIcon={ArrowRight}>
          Continue
        </Button>
      </div>
    </Stack>
  );
}

function Pending({ user }: { user: User }) {
  const router = useRouter();
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const logout = useLogout();
  const signUpRole = user.role === 'admin' ? 'client' : user.role;

  return (
    <div className={styles.root}>
      <MailVerse className={styles.pictogram} aria-hidden="true" />
      <Stack gap={5} className={styles.stack}>
        <p className={styles.body}>
          We sent a link to <strong>{user.email}</strong>. Open it to confirm your email, then we’ll
          help you set up your account. The link works for 24 hours.
        </p>
        <p className={styles.help}>No email after a few minutes? Check your spam folder.</p>

        {resend.isSuccess ? (
          <InlineNotification
            kind="success"
            title="Email sent again"
            subtitle={`We sent a new link at ${formatTime(resend.data.sentAt)}.`}
            lowContrast
            hideCloseButton
          />
        ) : null}
        {resend.isError || verify.isError ? (
          <InlineNotification
            kind="error"
            title="That didn’t work"
            subtitle={toUserMessage(resend.error ?? verify.error)}
            lowContrast
            hideCloseButton
          />
        ) : null}

        <div className={styles.actions}>
          <Button
            renderIcon={ArrowRight}
            className={styles.wrappingButton}
            disabled={verify.isPending}
            onClick={() =>
              verify.mutate(undefined, { onSuccess: ({ user: u }) => router.push(nextRoute(u)) })
            }
          >
            <span className={styles.wrappingLabel}>Open the email link (prototype)</span>
          </Button>
          <Button
            kind="tertiary"
            renderIcon={Email}
            disabled={resend.isPending}
            onClick={() => resend.mutate()}
          >
            Resend email
          </Button>
        </div>
        <p className={styles.help}>
          Wrong email?{' '}
          <Link
            href={routes.signUpAs(signUpRole)}
            onClick={(event) => {
              event.preventDefault();
              logout.mutate(undefined, {
                onSuccess: () => router.push(routes.signUpAs(signUpRole)),
              });
            }}
          >
            Sign up again with a different one
          </Link>
        </p>
      </Stack>
    </div>
  );
}
