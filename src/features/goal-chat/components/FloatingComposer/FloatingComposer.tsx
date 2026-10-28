'use client';

import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@carbon/react';
import { ArrowUp, Microphone, MicrophoneFilled } from '@carbon/icons-react';
import { useDictation } from '@/shared/hooks/useDictation';
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
  /** `dock`: sticks to the bottom of the page (chat). `inline`: sits in the flow (Home). */
  placement?: 'dock' | 'inline';
  /** `field`: Carbon's field look (default). `glow`: a rounded white box with a soft moving
   * blue rim and glow (admin Home, ADR 0015 exception). */
  look?: 'field' | 'glow';
  autoFocus?: boolean;
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
  placement = 'dock',
  look = 'field',
  autoFocus = false,
}: FloatingComposerProps) {
  const id = useId();
  const [text, setText] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation();
  const canSend = !isDisabled && !isBusy && text.trim().length > 0;

  const toggleDictation = () => {
    if (dictation.isListening) {
      dictation.stop();
      fieldRef.current?.focus();
      return;
    }
    // Speech is added after whatever is already typed.
    const typed = text.trim();
    dictation.start((spoken) =>
      setText((typed ? `${typed} ${spoken}` : spoken).slice(0, MAX_LENGTH)),
    );
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    dictation.stop();
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
    <div className={placement === 'dock' ? styles.dock : styles.inline}>
      <form
        className={`${styles.pill} ${look === 'glow' ? styles.glow : ''}`}
        onSubmit={submit}
        aria-label={label}
      >
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <label htmlFor={id} className={styles.srOnly}>
          {label}
        </label>
        <textarea
          ref={fieldRef}
          id={id}
          className={styles.field}
          rows={1}
          // Home opens straight into typing, like a search box.
          autoFocus={autoFocus}
          maxLength={MAX_LENGTH}
          placeholder={dictation.isListening ? 'Listening… speak now' : placeholder}
          value={text}
          disabled={isDisabled}
          autoComplete="off"
          aria-describedby={isDisabled && disabledHint ? `${id}-hint` : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.actions}>
          {dictation.canDictate ? (
            <Button
              kind="ghost"
              size="md"
              hasIconOnly
              renderIcon={dictation.isListening ? MicrophoneFilled : Microphone}
              iconDescription={dictation.isListening ? 'Stop dictation' : 'Dictate'}
              tooltipPosition="top"
              isSelected={dictation.isListening}
              aria-pressed={dictation.isListening}
              disabled={isDisabled}
              onClick={toggleDictation}
            />
          ) : null}
          <Button
            type="submit"
            kind="primary"
            size="md"
            hasIconOnly
            renderIcon={ArrowUp}
            iconDescription={isBusy ? 'Wait for the reply to finish' : 'Send'}
            tooltipPosition="top"
            disabled={!canSend}
            className={look === 'glow' ? styles.send : undefined}
          />
        </div>
      </form>
      {dictation.error ? (
        <p className={styles.hint} role="status">
          {dictation.error}
        </p>
      ) : isDisabled && disabledHint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {disabledHint}
        </p>
      ) : null}
    </div>
  );
}
