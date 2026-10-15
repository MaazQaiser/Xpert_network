'use client';

import Link from 'next/link';
import {
  Button,
  InlineNotification,
  ProgressIndicator,
  ProgressIndicatorSkeleton,
  ProgressStep,
  SkeletonText,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { formatDate, formatDateTime } from '@/shared/lib/dates';
import { AsyncBoundary, PageHeader, StatusTag } from '@/shared/ui';
import { useRequest, useRequote } from '../../api/queries';
import {
  STATUS_LABELS,
  TRACKER_LABELS,
  TRACKER_STEPS,
  trackerIndex,
  type CustomRequest,
} from '../../model/request.schema';
import { STATUS_TONE } from '../requestStatus';
import { DeliveredPanel } from './DeliveredPanel';
import { MessagesPanel } from './MessagesPanel';
import { ProgressPanel } from './ProgressPanel';
import { QuotePanel } from './QuotePanel';
import styles from './RequestDetail.module.scss';

/** F4 request detail: tracker, the stage's main panel, messages and activity. */
export function RequestDetail({ requestId }: { requestId: string }) {
  const request = useRequest(requestId);
  return (
    <AsyncBoundary
      query={request}
      errorTitle="This request didn’t load"
      loading={
        <div aria-busy="true" aria-label="Loading request">
          <SkeletonText heading width="50%" />
          <ProgressIndicatorSkeleton />
          <SkeletonText paragraph lineCount={6} />
        </div>
      }
    >
      {(data) => <DetailView request={data} />}
    </AsyncBoundary>
  );
}

function DetailView({ request }: { request: CustomRequest }) {
  const current = trackerIndex(request);
  const offTrack = ['declined', 'expired', 'cancelled'].includes(request.status);

  return (
    <>
      <PageHeader
        title={request.title}
        breadcrumbs={[{ label: 'Requests', href: '/requests' }]}
        subtitle={
          <>
            Requested {formatDate(request.createdAt)}
            {request.briefId ? (
              <>
                {' · '}
                <Link href={`/ask/${request.briefId}`}>From your research brief</Link>
              </>
            ) : null}
          </>
        }
        actions={
          <StatusTag tone={STATUS_TONE[request.status]} label={STATUS_LABELS[request.status]} />
        }
      />

      <nav aria-label="Request progress" className={styles.tracker}>
        <ProgressIndicator currentIndex={current} spaceEqually className={styles.indicator}>
          {TRACKER_STEPS.map((step, index) => (
            <ProgressStep
              key={step}
              label={TRACKER_LABELS[step]}
              description={`${STATUS_LABELS[step]}: ${index < current ? 'done' : index === current ? 'current' : 'not started'}`}
              complete={index < current || request.status === 'delivered'}
              invalid={offTrack && index === current}
            />
          ))}
        </ProgressIndicator>
      </nav>

      <div className={styles.layout}>
        <div className={styles.main}>
          <StagePanel request={request} />
          <Questions request={request} />
        </div>
        <aside className={styles.aside} aria-label="Messages and activity">
          <MessagesPanel request={request} />
          <Activity request={request} />
        </aside>
      </div>
    </>
  );
}

function StagePanel({ request }: { request: CustomRequest }) {
  switch (request.status) {
    case 'quote_requested':
      return (
        <section className={styles.card} aria-labelledby="stage-heading">
          <h2 id="stage-heading" className={styles.cardTitle}>
            We’re preparing your quote
          </h2>
          <p className={styles.help}>
            An analyst is checking which experts can answer your questions. Quotes usually arrive
            within 24 hours; we’ll notify you.
          </p>
        </section>
      );
    case 'quote_ready':
      return <QuotePanel request={request} />;
    case 'expired':
    case 'declined':
      return <ClosedQuote request={request} />;
    case 'accepted':
    case 'recruiting':
    case 'interviews':
    case 'analysis':
      return <ProgressPanel request={request} />;
    case 'delivered':
      return <DeliveredPanel request={request} />;
    case 'cancelled':
      return (
        <InlineNotification
          kind="info"
          title="Request cancelled"
          subtitle={`The ${request.quote?.credits ?? 0} held credits were returned to your balance.`}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      );
  }
}

function ClosedQuote({ request }: { request: CustomRequest }) {
  const requote = useRequote(request.id);
  const isExpired = request.status === 'expired';
  return (
    <section className={styles.card} aria-labelledby="stage-heading">
      <h2 id="stage-heading" className={styles.cardTitle}>
        {isExpired ? 'This quote expired' : 'You declined this quote'}
      </h2>
      <p className={styles.help}>
        {isExpired
          ? `It was valid until ${request.quote ? formatDate(request.quote.validUntil) : 'its expiry date'}. Prices and expert availability change, so we’ll check again.`
          : `Reason: ${request.declineReason ?? 'not given'}.`}
      </p>
      {requote.isError ? (
        <InlineNotification
          kind="error"
          title="Couldn’t ask for a new quote"
          subtitle={toUserMessage(requote.error)}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      ) : null}
      <div>
        <Button renderIcon={Renew} disabled={requote.isPending} onClick={() => requote.mutate()}>
          Ask for a new quote
        </Button>
      </div>
    </section>
  );
}

function Questions({ request }: { request: CustomRequest }) {
  const outIds = new Set(request.quote?.questionsOut.map((q) => q.questionId) ?? []);
  return (
    <section className={styles.card} aria-labelledby="questions-heading">
      <h2 id="questions-heading" className={styles.cardTitle}>
        Your questions
      </h2>
      {request.objective ? <p className={styles.help}>{request.objective}</p> : null}
      <ol className={styles.questions}>
        {request.questions.map((question) => (
          <li key={question.id} className={styles.question}>
            {question.text}
            {outIds.has(question.id) ? (
              <span className={styles.outTag}> (not in this quote)</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Activity({ request }: { request: CustomRequest }) {
  return (
    <section className={styles.card} aria-labelledby="activity-heading">
      <h2 id="activity-heading" className={styles.cardTitle}>
        Activity
      </h2>
      <ol className={styles.activity}>
        {[...request.timeline].reverse().map((entry) => (
          <li key={`${entry.status}-${entry.at}`} className={styles.activityItem}>
            <span className={styles.activityLabel}>{STATUS_LABELS[entry.status]}</span>
            {entry.note ? <span className={styles.activityNote}>{entry.note}</span> : null}
            <time
              className={styles.activityTime}
              dateTime={entry.at}
              title={formatDateTime(entry.at)}
            >
              {formatDate(entry.at)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
