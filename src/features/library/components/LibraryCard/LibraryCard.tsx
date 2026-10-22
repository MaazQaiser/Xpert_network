'use client';

import Link from 'next/link';
import { Tag } from '@carbon/react';
import {
  ArrowRight,
  Calendar,
  CheckmarkFilled,
  DocumentPdf,
  Location,
  Renew,
  Time,
  UserMultiple,
} from '@carbon/icons-react';
import { formatDate } from '@/shared/lib/dates';
import type { LibraryEntry } from '../../model/report.schema';
import styles from './LibraryCard.module.scss';

type LibraryCardProps = {
  entry: LibraryEntry;
  regionLabel: (id: string) => string;
  headingLevel?: 2 | 3;
  /** Name the industry too, where the card isn't already on that industry's shelf. */
  showIndustry?: boolean;
};

const NEW_FOR_DAYS = 30;

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < NEW_FOR_DAYS * 86_400_000;
}

/** One report on a shelf: what it covers, who's behind it, and whether it's yours. */
export function LibraryCard({
  entry,
  regionLabel,
  headingLevel = 3,
  showIndustry = false,
}: LibraryCardProps) {
  const Heading = `h${headingLevel}` as const;
  const href = entry.owned ? `/library/${entry.id}/read` : `/library/${entry.id}`;
  const regions = entry.regionIds.map(regionLabel).join(', ');
  return (
    <article className={styles.root}>
      <div className={styles.badges}>
        <Tag type="warm-gray" size="sm">
          {showIndustry
            ? `${entry.category.industry} · ${entry.category.subIndustry}`
            : entry.category.subIndustry}
        </Tag>
        <div className={styles.status}>
          {entry.updatedSincePurchase ? (
            <Tag type="blue" size="sm" renderIcon={Renew}>
              Updated
            </Tag>
          ) : null}
          {entry.owned ? (
            <Tag type="green" size="sm" renderIcon={CheckmarkFilled}>
              Owned
            </Tag>
          ) : isNew(entry.publishedAt) ? (
            <Tag type="purple" size="sm">
              New
            </Tag>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        <Heading className={styles.title}>
          <Link href={href} className={styles.link}>
            {entry.title}
          </Link>
        </Heading>
        <p className={styles.summary}>{entry.summary}</p>
      </div>

      <ul className={styles.meta} aria-label="Report details">
        <li>
          <UserMultiple size={16} aria-hidden="true" />
          {entry.expertCount} experts
        </li>
        {regions ? (
          <li>
            <Location size={16} aria-hidden="true" />
            {regions}
          </li>
        ) : null}
        <li>
          <Time size={16} aria-hidden="true" />
          {entry.readMinutes} min read
        </li>
        <li>
          <Calendar size={16} aria-hidden="true" />
          {formatDate(entry.publishedAt)}
        </li>
      </ul>

      <div className={styles.footer}>
        <p className={styles.format}>
          <DocumentPdf size={20} aria-hidden="true" className={styles.pdf} />
          PDF report · {entry.toc.length} sections
        </p>
        {/* Visual cue only: the title link already makes the whole card one tab stop. */}
        <span className={styles.cta} aria-hidden="true">
          {entry.owned ? 'Read report' : 'View details'}
          <ArrowRight size={16} className={styles.arrow} />
        </span>
      </div>
    </article>
  );
}
