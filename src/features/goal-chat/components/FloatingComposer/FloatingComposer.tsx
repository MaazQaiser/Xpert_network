'use client';

import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@carbon/react';
import { ArrowUp } from '@carbon/icons-react';
import styles from './FloatingComposer.module.scss';

type FloatingComposerProps = {
  label: string;
  placeholder: string;
  isBusy?: boolean;
  isDisabled?: boolean;
  /** Shown under the field when the composer can't be used, e.g. after submitting. */
  disabledHint?: string;
  /** Optional leading action, e.g. a "New brief" icon button. */
  leading?: ReactNode;
  onSend: (text: string) => void;
};

const MAX_LENGTH = 500;

/**
 * Pill-shaped message box that floats at the bottom centre of the page (Home and the goal
 * chat). Enter sends, Shift+Enter adds a line.
 */
export function FloatingComposer({
  label,
  placeholder,
  isBusy = false,
  isDisabled = false,
  disabledHint,
  leading,
  onSend,
}: FloatingComposerProps) {
  const id = useId();
  const [text, setText] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !isDisabled && !isBusy && text.trim().length > 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    fieldRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.dock}>
      <form className={styles.pill} onSubmit={submit} aria-label={label}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <label htmlFor={id} className={styles.srOnly}>
          {label}
        </label>
        <textarea
          ref={fieldRef}
          id={id}
          className={styles.field}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          value={text}
          disabled={isDisabled}
          autoComplete="off"
          aria-describedby={isDisabled && disabledHint ? `${id}-hint` : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          kind="primary"
          size="sm"
          hasIconOnly
          renderIcon={ArrowUp}
          iconDescription={isBusy ? 'Wait for the reply to finish' : 'Send'}
          tooltipPosition="top"
          disabled={!canSend}
          className={styles.send}
        />
      </form>
      {isDisabled && disabledHint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {disabledHint}
        </p>
      ) : null}
    </div>
  );
}
