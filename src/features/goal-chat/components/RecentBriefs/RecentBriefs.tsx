'use client';

import Link from 'next/link';
import { SkeletonText } from '@carbon/react';
import { ChevronRight } from '@carbon/icons-react';
import { StatusTag } from '@/shared/ui';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { useBriefs } from '../../api/queries';
import type { ResearchBrief } from '../../model/brief.schema';
import { STEP_LABELS } from '../../model/steps';
import styles from './RecentBriefs.module.scss';

const LIMIT = 4;

/** A brief worth resuming: it has a goal or a title. Empty drafts stay in the workspace. */
function hasContent(brief: ResearchBrief): boolean {
  return brief.title !== 'Untitled brief' || brief.objective !== null;
}

function displayTitle(brief: ResearchBrief): string {
  if (brief.title !== 'Untitled brief') return brief.title;
  return brief.objective ?? 'New research brief';
}

/** Home: the few latest briefs, so a conversation can be picked up (like recent chats). */
export function RecentBriefs() {
  const briefs = useBriefs();

  if (briefs.isPending) {
    return (
      <div className={styles.root} aria-busy="true" aria-label="Loading recent briefs">
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }
  // A failed or empty list just leaves Home focused on starting something new.
  const recent = (briefs.data ?? []).filter(hasContent).slice(0, LIMIT);
  if (recent.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="recent-briefs-heading">
      <div className={styles.header}>
        <h2 id="recent-briefs-heading" className={styles.heading}>
          Continue a brief
        </h2>
        <Link href={routes.client.workspace} className={styles.viewAll}>
          View all
        </Link>
      </div>
      <ul className={styles.list}>
        {recent.map((brief) => {
          const isSubmitted = brief.status === 'submitted';
          return (
            <li key={brief.id}>
              <Link href={routes.client.brief(brief.id)} className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.title}>{displayTitle(brief)}</span>
                  <span className={styles.meta}>
                    {isSubmitted ? 'Submitted' : `Next: ${STEP_LABELS[brief.currentStep].label}`} ·{' '}
                    <span title={formatDateTime(brief.updatedAt)}>
                      {formatRelative(brief.updatedAt)}
                    </span>
                  </span>
                </span>
                <StatusTag
                  size="sm"
                  tone={isSubmitted ? 'success' : 'info'}
                  label={isSubmitted ? 'Submitted' : 'Draft'}
                />
                <ChevronRight className={styles.chevron} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
