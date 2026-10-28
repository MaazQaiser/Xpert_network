'use client';

import { Button, InlineNotification } from '@carbon/react';
import styles from './ErrorState.module.scss';

export type ErrorStateProps = {
  title?: string;
  /** What happened + how to fix it, in plain language (UX_PRINCIPLES §9). */
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "This didn't load", message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.root}>
      <InlineNotification
        kind="error"
        title={title}
        subtitle={message}
        hideCloseButton
        lowContrast
      />
      {onRetry ? (
        <Button kind="tertiary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
