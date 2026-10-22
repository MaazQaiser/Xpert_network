'use client';

import Link from 'next/link';
import { Button, SkeletonText } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import { useLibraryEntry } from '@/features/library';
import { useOpenReportReview } from '../ReportReview/reportReviewContext';
import styles from './widgets.module.scss';

function firstSentence(text: string): string {
  const end = text.search(/[.!?](\s|$)/);
  if (end === -1) return text;
  return text.slice(0, end + 1);
}

/** A library report left in the thread, the way a chat app leaves a card. */
export function LibraryReportWidget({ reportId }: { reportId: string }) {
  const entry = useLibraryEntry(reportId);
  const openReport = useOpenReportReview();

  if (entry.isPending) {
    return (
      <div className={styles.storyCard} aria-busy="true" aria-label="Loading the library report">
        <SkeletonText paragraph lineCount={2} />
      </div>
    );
  }

  if (entry.isError || !entry.data) {
    return <p className={styles.muted}>The library report couldn’t be loaded.</p>;
  }

  const item = entry.data;
  return (
    <article className={styles.storyCard}>
      <span className={styles.label}>From the library</span>
      <span className={styles.sectionTitle}>{item.title}</span>
      <span className={styles.muted}>{firstSentence(item.summary)}</span>
      {openReport ? (
        <Button kind="ghost" size="sm" onClick={() => openReport(item.id)}>
          View report
        </Button>
      ) : (
        <Link href={routes.client.report(item.id)}>Open in the library</Link>
      )}
    </article>
  );
}
