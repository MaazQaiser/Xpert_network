'use client';

import Link from 'next/link';
import { SkeletonText } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import { formatMinutes, formatUsd } from '@/shared/lib/money';
import { AsyncBoundary, StatusTag, type StatusTone } from '@/shared/ui';
import { useInterviews } from '../../api/queries';
import {
  progressPercent,
  type Interview,
  type InterviewStatus,
} from '../../model/interview.schema';
import styles from './InterviewsList.module.scss';

const STATUS: Record<InterviewStatus, { tone: StatusTone; label: string; action: string }> = {
  ready: { tone: 'info', label: 'Ready to start', action: 'Start' },
  in_progress: { tone: 'progress', label: 'In progress', action: 'Continue' },
  paused: { tone: 'warning', label: 'Paused', action: 'Resume' },
  review: { tone: 'progress', label: 'Check your answers', action: 'Review' },
  submitted: { tone: 'progress', label: 'Under review', action: 'View' },
  accepted: { tone: 'success', label: 'Accepted', action: 'View' },
  rejected: { tone: 'neutral', label: 'Not accepted', action: 'View' },
};

const ORDER: InterviewStatus[] = [
  'in_progress',
  'paused',
  'review',
  'ready',
  'submitted',
  'accepted',
  'rejected',
];

/** The expert's interviews, unfinished ones first (expert home). */
export function InterviewsList() {
  const interviews = useInterviews();
  return (
    <AsyncBoundary
      query={interviews}
      errorTitle="Your interviews didn’t load"
      loading={<SkeletonText paragraph lineCount={3} />}
      isEmpty={(data) => data.length === 0}
      empty={
        <p className={styles.empty}>
          No interviews yet. When an application is approved, the interview appears here.{' '}
          <Link href={routes.expert.calls}>Browse open calls</Link>
        </p>
      }
    >
      {(data) => (
        <ul className={styles.list} aria-label="Your interviews">
          {[...data]
            .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
            .map((interview) => (
              <InterviewRow key={interview.id} interview={interview} />
            ))}
        </ul>
      )}
    </AsyncBoundary>
  );
}

function InterviewRow({ interview }: { interview: Interview }) {
  const status = STATUS[interview.status];
  const started = interview.status === 'in_progress' || interview.status === 'paused';
  return (
    <li className={styles.row}>
      <div className={styles.text}>
        <Link href={routes.expert.interview(interview.id)} className={styles.link}>
          {interview.callTitle}
        </Link>
        <span className={styles.meta}>
          {formatUsd(interview.feeUsd)} · {formatMinutes(interview.estMinutes)}
          {started ? ` · ${progressPercent(interview)}% done` : ''}
        </span>
      </div>
      <StatusTag tone={status.tone} label={status.label} />
    </li>
  );
}
