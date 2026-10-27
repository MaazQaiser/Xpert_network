'use client';

import type { ReactNode } from 'react';
import { Tooltip } from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import styles from './ReportPanel.module.scss';

/**
 * The AI's read on an expert, kept out of the way: a small animated mascot chip with a short
 * prompt ("Why them?", "AI summary"). Hover or focus it and the AI's words open in a tooltip,
 * with a reminder that they are the AI's reading, not a verified claim.
 */
export function AIHint({
  hint,
  label,
  title,
  lines,
  note = 'The AI’s reading of their background, not a verified claim.',
}: {
  /** The chip's short prompt, e.g. "Why them?". */
  hint: string;
  /** The trigger's accessible name, e.g. "Why the AI picked Sophia Bell". */
  label: string;
  /** The tooltip's heading. */
  title: string;
  /** What the AI says, one item per line. */
  lines: ReactNode[];
  note?: string;
}) {
  return (
    <Tooltip
      align="bottom"
      autoAlign
      description={
        <span className={styles.whyTip}>
          <span className={styles.whyTipTitle}>{title}</span>
          <span className={styles.whyTipList}>
            {lines.map((line, index) => (
              <span key={index}>{lines.length > 1 ? <>· {line}</> : line}</span>
            ))}
          </span>
          <span className={styles.whyTipNote}>{note}</span>
        </span>
      }
    >
      <button type="button" className={styles.whyTrigger} aria-label={label}>
        <span className={styles.whyMascot}>
          <AIExplainLabel size="sm" />
        </span>
        <span className={styles.whyHint} aria-hidden="true">
          {hint}
        </span>
      </button>
    </Tooltip>
  );
}
