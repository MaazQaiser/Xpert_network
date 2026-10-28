'use client';

import Link from 'next/link';
import { Button, InlineNotification, RadioButton, RadioButtonGroup } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { formatCredits } from '@/shared/lib/credits';
import { useRateDelivery } from '../../api/queries';
import type { CustomRequest } from '../../model/request.schema';
import styles from './RequestDetail.module.scss';

const RATINGS = ['1', '2', '3', '4', '5'] as const;

/** F4 delivered: open the report in the F3 reader, rate it, ask for a follow-up. */
export function DeliveredPanel({ request }: { request: CustomRequest }) {
  const rate = useRateDelivery(request.id);
  const delivery = request.delivery;
  if (!delivery) return null;
  const { interviewsDone, interviewsPlanned } = request.progress;

  return (
    <section className={styles.card} aria-labelledby="stage-heading">
      <h2 id="stage-heading" className={styles.cardTitle}>
        Your research is ready
      </h2>
      {delivery.partial ? (
        <InlineNotification
          kind="warning"
          title={`Delivered with ${interviewsDone} of ${interviewsPlanned} interviews`}
          subtitle={`Not every expert could take part, so ${formatCredits(delivery.refundCredits)} were refunded to your balance.`}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      ) : (
        <p className={styles.help}>
          {interviewsDone} experts answered your questions. The report is yours alone for 12 months.
        </p>
      )}
      <div className={styles.actions}>
        <Button as={Link} href={`/library/${delivery.reportId}/read`}>
          Open report
        </Button>
        <Button as={Link} href="/ask" kind="tertiary">
          Request a follow-up
        </Button>
      </div>

      <RadioButtonGroup
        legendText="How useful was this research?"
        name="delivery-rating"
        orientation="horizontal"
        valueSelected={delivery.rating ? String(delivery.rating) : undefined}
        onChange={(value) => rate.mutate({ rating: Number(value) })}
        disabled={rate.isPending}
        helperText="1 = not useful, 5 = very useful"
      >
        {RATINGS.map((r) => (
          <RadioButton key={r} id={`rating-${r}`} value={r} labelText={r} />
        ))}
      </RadioButtonGroup>
      {delivery.rating ? (
        <p className={styles.help} role="status">
          Thanks, you rated this {delivery.rating} out of 5.
        </p>
      ) : null}
      {rate.isError ? (
        <InlineNotification
          kind="error"
          title="Couldn’t save your rating"
          subtitle={toUserMessage(rate.error)}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      ) : null}
    </section>
  );
}
