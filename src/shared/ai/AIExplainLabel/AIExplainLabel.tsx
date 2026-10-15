'use client';

import type { ReactNode } from 'react';
import { AILabel, AILabelActions, AILabelContent } from '@carbon/react';
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
}: AIExplainLabelProps) {
  return (
    <AILabel
      size={size}
      autoAlign
      revertActive={isEdited}
      {...(onRevert ? { onRevertClick: onRevert } : {})}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      <AILabelContent>
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
          <p className={styles.meta}>Review and edit before you rely on it.</p>
        </div>
        {actions ? <AILabelActions>{actions}</AILabelActions> : null}
      </AILabelContent>
    </AILabel>
  );
}
