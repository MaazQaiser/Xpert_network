'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, InlineNotification, Modal, ProgressBar } from '@carbon/react';
import { UserAvatar } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { formatCredits } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { useCancelRequest } from '../../api/queries';
import type { CustomRequest } from '../../model/request.schema';
import styles from './RequestDetail.module.scss';

const STAGE_COPY = {
  accepted: 'Quote accepted. We’re inviting experts who match your questions.',
  recruiting: 'Experts are joining. You’ll see each one here as they confirm.',
  interviews: 'Interviews are under way with our AI interviewer.',
  analysis: 'All interviews are done. Analysts are writing your report.',
} as const;

/** F4 in progress: interviews done, experts joined (anonymous), delivery estimate, cancel. */
export function ProgressPanel({ request }: { request: CustomRequest }) {
  const cancel = useCancelRequest(request.id);
  const [isCancelling, setIsCancelling] = useState(false);
  const { progress } = request;
  const stage = request.status as keyof typeof STAGE_COPY;
  const canCancel = request.status === 'accepted' || request.status === 'recruiting';
  const held = request.quote?.credits ?? 0;

  return (
    <section className={styles.card} aria-labelledby="stage-heading">
      <h2 id="stage-heading" className={styles.cardTitle}>
        Research in progress
      </h2>
      <p className={styles.help}>{STAGE_COPY[stage]}</p>

      <ProgressBar
        label="Interviews"
        helperText={`${progress.interviewsDone} of ${progress.interviewsPlanned} done`}
        value={progress.interviewsDone}
        max={Math.max(1, progress.interviewsPlanned)}
        status={request.status === 'analysis' ? 'finished' : 'active'}
      />

      <dl className={styles.facts}>
        <div>
          <dt>Estimated delivery</dt>
          <dd>
            {progress.estimatedDelivery
              ? formatDate(progress.estimatedDelivery)
              : 'To be confirmed'}
          </dd>
        </div>
        <div>
          <dt>Credits held</dt>
          <dd>{formatCredits(held)} · spent on delivery</dd>
        </div>
      </dl>

      <div>
        <h3 className={styles.subTitle}>Experts</h3>
        {progress.experts.length === 0 ? (
          <p className={styles.help}>
            No experts confirmed yet. Most requests have the first within a day.
          </p>
        ) : (
          <ul className={styles.experts}>
            {progress.experts.map((expert) => (
              <li key={`${expert.role}-${expert.region}`} className={styles.expert}>
                <UserAvatar size={20} aria-hidden="true" />
                <span>
                  <span className={styles.expertRole}>{expert.role}</span>
                  <span className={styles.help}>
                    {expert.years} years · {expert.region}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCancel ? (
        <div>
          <Button kind="danger--ghost" onClick={() => setIsCancelling(true)}>
            Cancel request
          </Button>
        </div>
      ) : null}

      {createPortal(
        <Modal
          open={isCancelling}
          danger
          modalHeading="Cancel this request?"
          primaryButtonText={cancel.isPending ? 'Cancelling…' : 'Cancel request'}
          secondaryButtonText="Keep it"
          primaryButtonDisabled={cancel.isPending}
          onRequestClose={() => setIsCancelling(false)}
          onRequestSubmit={() =>
            cancel.mutate(undefined, { onSuccess: () => setIsCancelling(false) })
          }
          size="sm"
        >
          <p className={styles.help}>
            Interviews haven’t started, so the {formatCredits(held)} held for this request go back
            to your balance.
          </p>
          {cancel.isError ? (
            <InlineNotification
              kind="error"
              title="Couldn’t cancel"
              subtitle={toUserMessage(cancel.error)}
              lowContrast
              hideCloseButton
            />
          ) : null}
        </Modal>,
        document.body,
      )}
    </section>
  );
}
