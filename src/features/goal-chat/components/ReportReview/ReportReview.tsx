'use client';

import { Button, SkeletonText, Tag } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import { useLibraryEntry } from '@/features/library';
import { toUserMessage } from '@/shared/api';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { ErrorState } from '@/shared/ui';
import styles from './ReportReview.module.scss';

type ReportReviewProps = {
  reportId: string;
  onClose: () => void;
};

/** The report, read beside the chat. Closing is the parent’s animation. */
export function ReportReview({ reportId, onClose }: ReportReviewProps) {
  const entry = useLibraryEntry(reportId);

  return (
    <aside className={styles.root} aria-label="Report review">
      <header className={styles.header}>
        <p className={styles.kicker}>Report review</p>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={Close}
          iconDescription="Close report"
          tooltipPosition="left"
          onClick={onClose}
        />
      </header>
      {entry.isPending ? (
        <SkeletonText paragraph lineCount={6} />
      ) : entry.isError || !entry.data ? (
        <ErrorState
          title="This report didn’t load"
          message={entry.isError ? toUserMessage(entry.error) : 'It may have been withdrawn.'}
          onRetry={() => void entry.refetch()}
        />
      ) : (
        <div className={styles.body}>
          <h2 className={styles.title}>{entry.data.title}</h2>
          <div className={styles.tags}>
            <Tag type="gray" size="sm">
              {entry.data.category.industry}
            </Tag>
            <Tag type="gray" size="sm">
              {entry.data.owned
                ? 'In your library'
                : formatCreditsWithCurrency(entry.data.priceCredits)}
            </Tag>
          </div>
          <p className={styles.summary}>{entry.data.summary}</p>
          <p className={styles.meta}>
            Published {formatDate(entry.data.publishedAt)} · {entry.data.readMinutes} min read ·{' '}
            {entry.data.expertCount} experts
          </p>
          <h3 className={styles.sectionsLabel}>In this report</h3>
          <ol className={styles.sections}>
            {entry.data.toc.map((section) => (
              <li key={section.id}>{section.title}</li>
            ))}
          </ol>
          {entry.data.owned ? null : (
            <p className={styles.meta}>Buying this report unlocks the full sections.</p>
          )}
        </div>
      )}
    </aside>
  );
}
