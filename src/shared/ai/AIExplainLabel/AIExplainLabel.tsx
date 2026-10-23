'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { AILabel, AILabelActions, AILabelContent, Button } from '@carbon/react';
import { Undo } from '@carbon/icons-react';
import styles from './AIExplainLabel.module.scss';

export type AIExplainLabelProps = {
  /** What the AI did, in one sentence. */
  summary: string;
  /** What the AI used: sources, scope, model note. */
  basis?: string;
  /** Coverage or confidence signal shown to calibrate trust. */
  confidence?: string;
  size?: 'mini' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Set once a human has edited the AI output; switches the label to its revert state. */
  isEdited?: boolean;
  onRevert?: () => void;
  actions?: ReactNode;
  /** Accessible context, e.g. "Research brief". */
  'aria-label'?: string;
  /** `ai`: Carbon's AI label (default). `mascot`: the animated assistant mascot as a plain mark,
   * with an inline "Revert to AI draft" once edited (screen 03; AI_NATIVE §3 exception). */
  mark?: 'ai' | 'mascot';
};

/** Carbon AILabel with Xpert Network's standard explainability content (AI_NATIVE §3). */
export function AIExplainLabel({
  summary,
  basis,
  confidence,
  size = 'xs',
  isEdited = false,
  onRevert,
  actions,
  'aria-label': ariaLabel,
  mark = 'ai',
}: AIExplainLabelProps) {
  const explanation = (
    <div className={styles.content}>
      <p className={styles.eyebrow}>AI explained</p>
      <p className={styles.summary}>{summary}</p>
      {basis ? (
        <p className={styles.meta}>
          <strong>Based on:</strong> {basis}
        </p>
      ) : null}
      {confidence ? (
        <p className={styles.meta}>
          <strong>Confidence:</strong> {confidence}
        </p>
      ) : null}
      <p className={styles.meta}>
        {isEdited
          ? 'You edited this. Revert to bring back the AI draft.'
          : 'Review and edit before you rely on it.'}
      </p>
    </div>
  );

  // The mascot marks AI content on its own (no popover); when a person has edited it, an
  // inline action brings the AI draft back.
  if (mark === 'mascot') {
    return (
      <span className={styles.mascotMark}>
        <Image
          src="/images/assistant-mascot.png"
          alt={`AI generated${ariaLabel ? `: ${ariaLabel}` : ''}`}
          width={20}
          height={24}
          className={styles.mascot}
        />
        {isEdited && onRevert ? (
          <Button kind="ghost" size="sm" renderIcon={Undo} onClick={onRevert}>
            Revert to AI draft
          </Button>
        ) : null}
      </span>
    );
  }

  return (
    <AILabel
      size={size}
      autoAlign
      revertActive={isEdited}
      {...(onRevert ? { onRevertClick: onRevert } : {})}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      <AILabelContent>
        {explanation}
        {actions ? <AILabelActions>{actions}</AILabelActions> : null}
      </AILabelContent>
    </AILabel>
  );
}
