'use client';

import { createPortal } from 'react-dom';
import { IconButton } from '@carbon/react';
import { ArrowRight, Close, TaskComplete } from '@carbon/icons-react';
import styles from './AnswerToast.module.scss';

/**
 * A finished step in the home chat. Sits at the top right, in the page body so the chat's
 * animated layers can't pin it. The card runs the next action; the bar along the bottom runs
 * down while it waits, pauses under the pointer or focus, and the toast leaves when it runs
 * out (or stays put with reduced motion).
 */
export function FlowToast({
  label,
  title,
  action,
  onAction,
  onClose,
}: {
  /** Accessible name for the card. */
  label: string;
  title: string;
  /** The next step, shown under the title. The whole card runs it. */
  action: string;
  onAction: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className={styles.region} role="status" aria-live="polite">
      <article className={styles.toast} aria-label={label}>
        <span className={styles.icon} aria-hidden="true">
          <TaskComplete size={20} />
        </span>
        <button type="button" className={styles.body} onClick={onAction}>
          <span className={styles.title}>{title}</span>
          <span className={styles.cta}>
            {action}
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

/** An expert has answered the screening questions. Opening the toast shows those answers. */
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
  return (
    <FlowToast
      label={`${name} answered`}
      title={`${name} answered the screening questions`}
      action="Review answers"
      onAction={onOpen}
      onClose={onClose}
    />
  );
}
