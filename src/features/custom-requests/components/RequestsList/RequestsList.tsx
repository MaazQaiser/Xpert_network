'use client';

import Link from 'next/link';
import { Button, SkeletonPlaceholder } from '@carbon/react';
import { Add, ArrowRight } from '@carbon/icons-react';
import { Report } from '@carbon/pictograms-react';
import { formatCredits } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, PageHeader, StatusTag } from '@/shared/ui';
import { useRequests } from '../../api/queries';
import { isActive, STATUS_LABELS, type CustomRequest } from '../../model/request.schema';
import { STATUS_TONE } from '../requestStatus';
import styles from './RequestsList.module.scss';

/** What's next for a request, in one line. */
export function requestSummary(request: CustomRequest): string {
  const { quote, progress, delivery } = request;
  switch (request.status) {
    case 'quote_requested':
      return 'We’re preparing your quote, usually within 24 hours';
    case 'quote_ready':
      return quote
        ? `${formatCredits(quote.credits)} · ${quote.experts} experts · valid until ${formatDate(quote.validUntil)}`
        : 'Quote ready';
    case 'accepted':
    case 'recruiting':
      return `Recruiting ${progress.interviewsPlanned} experts${progress.estimatedDelivery ? ` · due ${formatDate(progress.estimatedDelivery)}` : ''}`;
    case 'interviews':
      return `${progress.interviewsDone} of ${progress.interviewsPlanned} interviews done${progress.estimatedDelivery ? ` · due ${formatDate(progress.estimatedDelivery)}` : ''}`;
    case 'analysis':
      return `Analysts are writing your report${progress.estimatedDelivery ? ` · due ${formatDate(progress.estimatedDelivery)}` : ''}`;
    case 'delivered':
      return delivery?.partial
        ? `Delivered with ${progress.interviewsDone} of ${progress.interviewsPlanned} interviews · ${formatCredits(delivery.refundCredits)} refunded`
        : `Delivered ${formatDate(request.updatedAt)}`;
    case 'expired':
      return 'The quote expired. Ask for a new one.';
    case 'declined':
      return 'You declined the quote';
    case 'cancelled':
      return 'Cancelled · held credits refunded';
  }
}

/** F4 requests list: open requests first, then closed ones. */
export function RequestsList() {
  const requests = useRequests();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Requests"
        subtitle="Custom research we’re quoting, running or have delivered for you."
        actions={
          <Button as={Link} href="/ask" renderIcon={Add}>
            New request
          </Button>
        }
      />
      <AsyncBoundary
        query={requests}
        errorTitle="Your requests didn’t load"
        loading={
          <div className={styles.list} aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2].map((i) => (
              <SkeletonPlaceholder key={i} className={styles.skeleton} />
            ))}
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            pictogram={<Report aria-hidden="true" />}
            title="No custom research yet"
            description="Describe a goal and we’ll check the library first, then quote expert research for anything it doesn’t answer."
            action={
              <Button as={Link} href="/ask" renderIcon={ArrowRight}>
                Describe a goal
              </Button>
            }
          />
        }
      >
        {(data) => {
          const open = data.filter((r) => isActive(r.status));
          const closed = data.filter((r) => !isActive(r.status));
          return (
            <div className={styles.groups}>
              {open.length > 0 ? <Group title="In progress" requests={open} /> : null}
              {closed.length > 0 ? <Group title="Closed" requests={closed} /> : null}
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}

function Group({ title, requests }: { title: string; requests: CustomRequest[] }) {
  const headingId = `requests-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className={styles.group}>
      <h2 id={headingId} className={styles.groupTitle}>
        {title} <span className={styles.count}>{requests.length}</span>
      </h2>
      <ul className={styles.list}>
        {requests.map((request) => (
          <li key={request.id} className={styles.card}>
            <div className={styles.cardMain}>
              <h3 className={styles.cardTitle}>
                <Link href={`/requests/${request.id}`} className={styles.link}>
                  {request.title}
                </Link>
              </h3>
              <p className={styles.summary}>{requestSummary(request)}</p>
            </div>
            <StatusTag tone={STATUS_TONE[request.status]} label={STATUS_LABELS[request.status]} />
          </li>
        ))}
      </ul>
    </section>
  );
}
