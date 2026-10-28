'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@carbon/react';
import { Document } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import { useOpenReportReview } from '../ReportReview/reportReviewContext';
import styles from './widgets.module.scss';

type SourceShare = { label: string; percent: number };

type ReportArtifactProps = {
  reportId: string;
  title: string;
  finding: string;
  sources: SourceShare[];
  /** Bars grow in while the demo is playing. */
  live: boolean;
};

function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'report'}.txt`;
}

function downloadReport(title: string, finding: string, sources: SourceShare[]) {
  const lines = [
    title,
    '',
    finding,
    '',
    'Where the answer comes from',
    ...sources.map((source) => `${source.label}: ${source.percent}%`),
    '',
    'The open share is not in the library. Request custom research for that depth.',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(title);
  link.click();
  URL.revokeObjectURL(url);
}

/** A report crafted in the thread, with its source mix and a download. */
export function ReportArtifact({ reportId, title, finding, sources, live }: ReportArtifactProps) {
  const [drawn, setDrawn] = useState(!live);
  const openReport = useOpenReportReview();

  useEffect(() => {
    if (!live) return;
    const frame = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [live]);

  return (
    <article className={styles.artifact}>
      <header className={styles.artifactHeader}>
        <Document size={20} aria-hidden="true" />
        <div>
          <span className={styles.label}>Report</span>
          <h3 className={styles.sectionTitle}>{title}</h3>
        </div>
      </header>
      <p className={styles.muted}>{finding}</p>
      <ul className={styles.sources} aria-label="Where the answer comes from">
        {sources.map((source, index) => (
          <li key={source.label}>
            <div className={styles.sourceLabel}>
              <span>{source.label}</span>
              <span>{source.percent}%</span>
            </div>
            <span className={styles.track}>
              <span
                className={styles.bar}
                data-source={index}
                style={{ inlineSize: drawn ? `${source.percent}%` : '0%' }}
              />
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.buttonRow}>
        <Button size="sm" kind="tertiary" onClick={() => downloadReport(title, finding, sources)}>
          Download
        </Button>
        {openReport ? (
          <Button size="sm" kind="ghost" onClick={() => openReport(reportId)}>
            View report
          </Button>
        ) : (
          <Button as={Link} href={routes.client.report(reportId)} size="sm" kind="ghost">
            Open in the library
          </Button>
        )}
      </div>
    </article>
  );
}
