'use client';

import type { ReactNode } from 'react';
import { Button } from '@carbon/react';
import styles from './SelectionBar.module.scss';

export type SelectionBarProps = {
  /** e.g. "8 of 10 selected." */
  summary: string;
  /** Optional next-step hint shown after the summary. */
  hint?: string;
  children: ReactNode;
  onClear?: () => void;
};

/**
 * Sticky bottom bar for selection actions (ADMIN_PLAN §2 #5 / wireframe 05).
 * Carbon puts batch actions in the table toolbar; the PRD puts them at the bottom.
 */
export function SelectionBar({ summary, hint, children, onClear }: SelectionBarProps) {
  return (
    <div className={styles.root} role="region" aria-label="Selection actions">
      <p className={styles.summary}>
        <span className={styles.count}>{summary}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </p>
      <div className={styles.actions}>
        {onClear ? (
          <Button kind="ghost" size="md" onClick={onClear}>
            Clear
          </Button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
