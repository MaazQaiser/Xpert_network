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
import { ArrowRight, Edit } from '@carbon/icons-react';
import { Handshake, Time, Warning_01 as Warning } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, StatusTag } from '@/shared/ui';
import { useExpertOnboarding, useReopenExpertProfile } from '../../api/queries';
import {
  addBusinessDays,
  REVIEW_BUSINESS_DAYS,
  type ExpertOnboarding,
} from '../../model/expert.schema';
import styles from './ExpertPending.module.scss';

/** F7 "Pending approval" status page, with approved and rejected outcomes. */
export function ExpertPending() {
  const profile = useExpertOnboarding();
  return (
    <AsyncBoundary
      query={profile}
      errorTitle="Couldn’t load your review status"
      loading={
        <div className={styles.root} aria-busy="true" aria-label="Loading your review status">
          <SkeletonPlaceholder className={styles.pictogram} />
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={4} />
        </div>
      }
    >
      {(data) =>
        data.status === 'approved' ? (
          <Approved profile={data} />
        ) : data.status === 'rejected' ? (
          <Rejected profile={data} />
        ) : data.status === 'pending' ? (
          <Pending profile={data} />
        ) : (
          <NotSubmitted />
        )
      }
    </AsyncBoundary>
  );
}

function Pending({ profile }: { profile: ExpertOnboarding }) {
  const submitted = profile.submittedAt ? new Date(profile.submittedAt) : new Date();
  const eta = addBusinessDays(submitted, REVIEW_BUSINESS_DAYS).toISOString();
  return (
    <div className={styles.root}>
      <Time className={styles.pictogram} aria-hidden="true" />
      <div>
        <StatusTag tone="info" label="In review" />
        <h1 className={styles.title}>Thanks — we’re reviewing your profile</h1>
        <p className={styles.body}>
          Submitted {formatDate(submitted.toISOString())}. You’ll hear from us by{' '}
          <strong>{formatDate(eta)}</strong>, by email and in your notifications.
        </p>
      </div>
      <section aria-labelledby="next-heading">
        <h2 id="next-heading" className={styles.subtitle}>
          What happens next
        </h2>
        <ol className={styles.steps}>
          <li>
            We check your work history and conflicts. We may email you a question — reply to keep
            your review moving.
          </li>
          <li>Once approved, open calls that match your expertise appear on your home page.</li>
          <li>
            Apply to a call, then give your interview by voice or text with our AI interviewer, when
            it suits you. You’re paid for each accepted interview.
          </li>
        </ol>
      </section>
      <p className={styles.help}>
        Questions? Email <a href="mailto:experts@proptyop.example">experts@proptyop.example</a>.
      </p>
    </div>
  );
}

function Approved({ profile }: { profile: ExpertOnboarding }) {
  return (
    <div className={styles.root}>
      <Handshake className={styles.pictogram} aria-hidden="true" />
      <div>
        <StatusTag tone="success" label="Approved" />
        <h1 className={styles.title}>You’re approved</h1>
        <p className={styles.body}>
          {profile.decidedAt ? `Approved ${formatDate(profile.decidedAt)}. ` : ''}You can now apply
          to open calls that match your expertise.
        </p>
      </div>
      <div className={styles.actions}>
        <Button as={Link} href={routes.expert.calls} renderIcon={ArrowRight}>
          Browse open calls
        </Button>
        <Button as={Link} href={routes.expert.home} kind="tertiary">
          Go to expert home
        </Button>
      </div>
    </div>
  );
}

function Rejected({ profile }: { profile: ExpertOnboarding }) {
  const router = useRouter();
  const reopen = useReopenExpertProfile();
  return (
    <div className={styles.root}>
      <Warning className={styles.pictogram} aria-hidden="true" />
      <div>
        <StatusTag tone="warning" label="Changes needed" />
        <h1 className={styles.title}>We couldn’t approve your profile yet</h1>
        <p className={styles.body}>
          {profile.decidedAt ? `Reviewed ${formatDate(profile.decidedAt)}. ` : ''}Most profiles are
          approved after one round of changes.
        </p>
      </div>
      <Stack gap={5}>
        {profile.decisionNote ? (
          <InlineNotification
            kind="warning"
            title="What to change"
            subtitle={profile.decisionNote}
            lowContrast
            hideCloseButton
          />
        ) : null}
        {reopen.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t reopen your profile"
            subtitle={toUserMessage(reopen.error)}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <div className={styles.actions}>
          <Button
            renderIcon={Edit}
            disabled={reopen.isPending}
            onClick={() =>
              reopen.mutate(undefined, {
                onSuccess: () => router.push(routes.expert.onboarding),
              })
            }
          >
            Update and resubmit
          </Button>
        </div>
        <p className={styles.help}>
          Think we got it wrong? Email{' '}
          <a href="mailto:experts@proptyop.example">experts@proptyop.example</a>.
        </p>
      </Stack>
    </div>
  );
}

function NotSubmitted() {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Your profile isn’t submitted yet</h1>
      <div>
        <Button as={Link} href={routes.expert.onboarding} renderIcon={ArrowRight}>
          Continue your profile
        </Button>
      </div>
    </div>
  );
}
