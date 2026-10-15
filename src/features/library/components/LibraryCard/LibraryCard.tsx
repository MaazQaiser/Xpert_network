'use client';

import Link from 'next/link';
import { Tag } from '@carbon/react';
import { CheckmarkFilled, UserMultiple } from '@carbon/icons-react';
import { formatCredits, formatCurrencyEquivalent } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import type { LibraryEntry } from '../../model/report.schema';
import styles from './LibraryCard.module.scss';

type LibraryCardProps = {
  entry: LibraryEntry;
  regionLabel: (id: string) => string;
  headingLevel?: 2 | 3;
};

/** One report on a shelf: what it covers, who's behind it, and its price or ownership. */
export function LibraryCard({ entry, regionLabel, headingLevel = 3 }: LibraryCardProps) {
  const Heading = `h${headingLevel}` as const;
  const href = entry.owned ? `/library/${entry.id}/read` : `/library/${entry.id}`;
  return (
    <article className={styles.root}>
      <p className={styles.eyebrow}>
        {entry.category.industry} · {entry.category.subIndustry}
      </p>
      <Heading className={styles.title}>
        <Link href={href} className={styles.link}>
          {entry.title}
        </Link>
      </Heading>
      <p className={styles.summary}>{entry.summary}</p>
      <p className={styles.meta}>
        <UserMultiple size={16} aria-hidden="true" />
        <span>
          {entry.expertCount} experts · {entry.regionIds.map(regionLabel).join(', ')} ·{' '}
          {formatDate(entry.publishedAt)}
        </span>
      </p>
      <div className={styles.footer}>
        {entry.owned ? (
          <Tag type="green" size="md" renderIcon={CheckmarkFilled}>
            Owned
          </Tag>
        ) : (
          <p className={styles.price}>
            <strong>{formatCredits(entry.priceCredits)}</strong>{' '}
            <span className={styles.currency}>{formatCurrencyEquivalent(entry.priceCredits)}</span>
          </p>
        )}
        {entry.updatedSincePurchase ? (
          <Tag type="blue" size="md">
            Updated
          </Tag>
        ) : null}
      </div>
    </article>
  );
}
