'use client';

import { createPortal } from 'react-dom';
import { IconButton } from '@carbon/react';
import { Close, SendAltFilled } from '@carbon/icons-react';
import styles from '../AdminHome/AnswerToast.module.scss';

/**
 * A toast at the top right, like the Home chat's: the report went out (or any short note). It
 * leaves on its own after a few seconds, holding while pointed at or focused.
 */
export function SentToast({
  title,
  detail,
  icon = <SendAltFilled size={20} />,
  tone = 'success',
  onClose,
}: {
  title: string;
  detail: string;
  /** Defaults to the send mark; other notes can pass their own. */
  icon?: React.ReactNode;
  /** Green for done, blue for information. */
  tone?: 'success' | 'info';
  onClose: () => void;
}) {
  return createPortal(
    <div className={styles.region} role="status" aria-live="polite">
      <article className={styles.toast} aria-label={title}>
        <span
          className={tone === 'info' ? `${styles.icon} ${styles.iconInfo}` : styles.icon}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className={styles.message}>
          <span className={styles.title}>{title}</span>
          <span className={styles.detail}>{detail}</span>
        </div>
        <IconButton
          className={styles.close}
          kind="ghost"
          size="sm"
          label="Dismiss"
          align="left"
          onClick={onClose}
        >
          <Close />
        </IconButton>
        <span className={styles.timer} aria-hidden="true" onAnimationEnd={onClose} />
      </article>
    </div>,
    document.body,
  );
}
