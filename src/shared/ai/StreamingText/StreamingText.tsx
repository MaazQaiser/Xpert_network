'use client';

import styles from './StreamingText.module.scss';

export type StreamingTextProps = {
  text: string;
  isStreaming: boolean;
};

/**
 * Plain-text AI output (never raw HTML). Announced politely to screen readers once it
 * settles, so assistive tech isn't flooded token by token (AI_NATIVE §7).
 */
export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <div className={styles.root}>
      <p className={styles.text} aria-hidden={isStreaming}>
        {text}
        {isStreaming ? <span className={styles.cursor} aria-hidden="true" /> : null}
      </p>
      <p className={styles.srOnly} aria-live="polite">
        {isStreaming ? '' : text}
      </p>
    </div>
  );
}
