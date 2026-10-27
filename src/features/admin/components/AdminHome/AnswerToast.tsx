'use client';

import { createPortal } from 'react-dom';
import { IconButton } from '@carbon/react';
import { ArrowRight, Close, TaskComplete } from '@carbon/icons-react';
import styles from './AnswerToast.module.scss';

/**
 * Home chat: an expert has answered the screening questions. A toast at the top right, in the
 * page body so the chat's animated layers can't pin it. The whole card opens that expert's
 * answers in the chat; the bar along the bottom runs down while it waits, pauses under the
 * pointer or focus, and the toast leaves when it runs out (or stays put with reduced motion).
 */
export function AnswerToast({
  name,
  onOpen,
  onClose,
}: {
  name: string;
  /** Opens this expert's answers in the chat. */
  onOpen: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className={styles.region} role="status" aria-live="polite">
      <article className={styles.toast} aria-label={`${name} answered`}>
        <span className={styles.icon} aria-hidden="true">
          <TaskComplete size={20} />
        </span>
        <button type="button" className={styles.body} onClick={onOpen}>
          <span className={styles.title}>{name} answered the screening questions</span>
          <span className={styles.cta}>
            Review answers
            <ArrowRight size={16} aria-hidden={true} />
          </span>
        </button>
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
