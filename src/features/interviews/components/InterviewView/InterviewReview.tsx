'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, InlineNotification, TextArea } from '@carbon/react';
import { ArrowRight, Edit } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatUsd } from '@/shared/lib/money';
import { PageHeader, StatusTag } from '@/shared/ui';
import { useEditSummary, useSubmitInterview } from '../../api/queries';
import {
  summaryEditSchema,
  type Interview,
  type SectionSummary,
} from '../../model/interview.schema';
import styles from './InterviewView.module.scss';

/** F9 step 5: the AI's summary of each section; the expert edits or confirms, then submits. */
export function InterviewReview({ interview }: { interview: Interview }) {
  const submit = useSubmitInterview(interview.id);
  const covered = interview.sections.reduce((n, s) => n + s.answered, 0);
  const total = interview.sections.reduce((n, s) => n + s.total, 0);
  const fee = interview.endedEarly
    ? Math.round((interview.feeUsd * covered) / Math.max(1, total))
    : interview.feeUsd;

  return (
    <>
      <PageHeader
        title="Check your answers"
        breadcrumbs={[{ label: 'Interview requests', href: routes.expert.calls }]}
        subtitle={interview.callTitle}
      />
      <div className={styles.review}>
        {interview.endedEarly ? (
          <InlineNotification
            kind="info"
            title={`You ended early: ${covered} of ${total} questions covered`}
            subtitle={`That’s fine. If accepted, you’ll be paid ${formatUsd(fee)} of the ${formatUsd(interview.feeUsd)} fee.`}
            lowContrast
            hideCloseButton
            className={styles.notice}
          />
        ) : null}
        <p className={styles.body}>
          The interviewer drafted a short summary of each section from your own words. The client
          sees these summaries and anonymous quotes, never your name. Edit anything that isn’t quite
          right.
        </p>
        <ol className={styles.summaries} aria-label="Section summaries">
          {interview.summaries.map((summary) => (
            <SummaryItem
              key={summary.sectionId}
              interview={interview}
              summary={summary}
              title={interview.sections.find((s) => s.id === summary.sectionId)?.title ?? 'Section'}
            />
          ))}
        </ol>
        {submit.isError ? (
          <InlineNotification
            kind="error"
            title="Your interview didn’t submit"
            subtitle={`${toUserMessage(submit.error)} Your summaries are saved.`}
            lowContrast
            hideCloseButton
            className={styles.notice}
          />
        ) : null}
        <div>
          <Button
            renderIcon={ArrowRight}
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Submitting…' : 'Submit interview'}
          </Button>
        </div>
      </div>
    </>
  );
}

function SummaryItem({
  interview,
  summary,
  title,
}: {
  interview: Interview;
  summary: SectionSummary;
  title: string;
}) {
  const edit = useEditSummary(interview.id);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(summary.text);
  const [error, setError] = useState<string | null>(null);
  const headingId = `summary-${summary.sectionId}`;

  const save = () => {
    const parsed = summaryEditSchema.safeParse({ sectionId: summary.sectionId, text: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the summary.');
      return;
    }
    setError(null);
    edit.mutate(
      { sectionId: summary.sectionId, text: parsed.data.text },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  return (
    <li className={styles.summary} aria-labelledby={headingId}>
      <div className={styles.summaryHeader}>
        <h2 id={headingId} className={styles.subTitle}>
          {title}
        </h2>
        <AIExplainLabel
          aria-label={`${title} summary`}
          summary="Drafted by the AI interviewer from your answers in this section."
          basis="Only what you said here; exact figures you shared were left out."
          isEdited={summary.isEdited}
          onRevert={() => {
            edit.mutate({ sectionId: summary.sectionId, text: null });
            setDraft(summary.aiText);
          }}
        />
        {summary.isEdited ? <StatusTag tone="info" label="Edited by you" /> : null}
      </div>
      {isEditing ? (
        <div className={styles.summaryEdit}>
          <TextArea
            id={`summary-text-${summary.sectionId}`}
            labelText={`Summary of ${title.toLowerCase()}`}
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            invalid={Boolean(error)}
            invalidText={error ?? undefined}
          />
          <div className={styles.composerActions}>
            <Button size="md" disabled={edit.isPending} onClick={save}>
              Save summary
            </Button>
            <Button
              kind="ghost"
              size="md"
              onClick={() => {
                setDraft(summary.text);
                setError(null);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.body}>{summary.text}</p>
          <div>
            <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => setIsEditing(true)}>
              Edit summary
            </Button>
          </div>
        </>
      )}
      {edit.isError ? (
        <InlineNotification
          kind="error"
          title="Couldn’t save"
          subtitle={toUserMessage(edit.error)}
          lowContrast
          hideCloseButton
        />
      ) : null}
    </li>
  );
}

/** F9 step 6 and after: under review, accepted or not accepted. */
export function InterviewSubmitted({ interview }: { interview: Interview }) {
  const accepted = interview.status === 'accepted';
  const rejected = interview.status === 'rejected';
  return (
    <>
      <PageHeader
        title={
          accepted
            ? 'Interview accepted'
            : rejected
              ? 'Interview not accepted'
              : 'Interview submitted'
        }
        breadcrumbs={[{ label: 'Interview requests', href: routes.expert.calls }]}
        subtitle={interview.callTitle}
        actions={
          <StatusTag
            tone={accepted ? 'success' : rejected ? 'neutral' : 'progress'}
            label={accepted ? 'Fee approved' : rejected ? 'Not accepted' : 'Under review'}
          />
        }
      />
      <section className={styles.card} aria-labelledby="submitted-heading">
        <h2 id="submitted-heading" className={styles.cardTitle}>
          {accepted
            ? `${formatUsd(interview.feeUsd)} is ready to pay out`
            : rejected
              ? 'This one wasn’t accepted'
              : 'Under review — usually within 48 hours'}
        </h2>
        <p className={styles.body}>
          {accepted
            ? 'Thanks for your time. Request a payout from your earnings page whenever you like.'
            : rejected
              ? (interview.decisionNote ?? 'See your earnings page for details.')
              : 'Our team checks every interview before the client sees it. Your fee shows as pending on your earnings page until then.'}
        </p>
        <div className={styles.composerActions}>
          <Button as={Link} href={routes.expert.earnings} renderIcon={ArrowRight}>
            Go to earnings
          </Button>
          <Button as={Link} href={routes.expert.calls} kind="tertiary">
            Browse interview requests
          </Button>
        </div>
      </section>
    </>
  );
}
