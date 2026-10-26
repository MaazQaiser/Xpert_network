'use client';

import Image from 'next/image';
import { Button } from '@carbon/react';
import { Search, Undo } from '@carbon/icons-react';
import styles from './AIExplainLabel.module.scss';

export type AIExplainLabelProps = {
  /** Mark size; the small sizes sit inline with body text, the large ones beside headings. */
  size?: 'mini' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Set once a human has edited the AI output; shows "Revert to AI draft" beside the mark. */
  isEdited?: boolean;
  onRevert?: () => void;
  /** The AI is researching right now: the mascot looks around with a magnifier. */
  isWorking?: boolean;
  /** Accessible context, e.g. "Research brief" → "AI generated: Research brief". */
  'aria-label'?: string;
};

// Mascot height per size, matching the line it sits on.
const HEIGHTS: Record<NonNullable<AIExplainLabelProps['size']>, number> = {
  mini: 16,
  '2xs': 16,
  xs: 20,
  sm: 20,
  md: 24,
  lg: 24,
  xl: 24,
};

/**
 * Marks AI-written content across the product with the animated assistant mascot (AI_NATIVE §3,
 * as amended 2026-10-23: no explainability popover). Once a person edits the content, an
 * inline "Revert to AI draft" brings the AI's version back.
 */
export function AIExplainLabel({
  size = 'md',
  isEdited = false,
  onRevert,
  isWorking = false,
  'aria-label': ariaLabel,
}: AIExplainLabelProps) {
  const height = HEIGHTS[size];
  return (
    <span className={styles.mascotMark} data-working={isWorking || undefined}>
      <span className={styles.body}>
        <Image
          src="/images/assistant-mascot.png"
          alt={`${isWorking ? 'AI working' : 'AI generated'}${ariaLabel ? `: ${ariaLabel}` : ''}`}
          width={Math.round(height * 0.84)}
          height={height}
          className={styles.mascot}
          style={{ blockSize: height }}
        />
        {/* Researching: a small magnifier the mascot sweeps as it looks around. */}
        {isWorking ? <Search size={12} className={styles.lens} aria-hidden={true} /> : null}
      </span>
      {isEdited && onRevert ? (
        <Button kind="ghost" size="sm" renderIcon={Undo} onClick={onRevert}>
          Revert to AI draft
        </Button>
      ) : null}
    </span>
  );
}
