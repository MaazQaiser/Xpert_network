'use client';

import { useState, type FormEvent } from 'react';
import { Button, TextInput } from '@carbon/react';
import { Send } from '@carbon/icons-react';
import styles from './Composer.module.scss';

type ComposerProps = {
  placeholder: string;
  isBusy: boolean;
  isDisabled: boolean;
  onSend: (text: string) => void;
};

/** Free-text reply. Chips and widgets are the main input; typing always works too. */
export function Composer({ placeholder, isBusy, isDisabled, onSend }: ComposerProps) {
  const [text, setText] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || isBusy) return;
    onSend(value);
    setText('');
  };

  return (
    <form className={styles.root} onSubmit={handleSubmit} aria-label="Reply">
      <TextInput
        id="goal-chat-input"
        labelText="Your reply"
        hideLabel
        placeholder={placeholder}
        value={text}
        disabled={isDisabled}
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
        className={styles.input}
      />
      <Button
        type="submit"
        hasIconOnly
        renderIcon={Send}
        iconDescription={isBusy ? 'Wait for the reply to finish' : 'Send'}
        tooltipPosition="top"
        disabled={isDisabled || isBusy || !text.trim()}
      />
    </form>
  );
}
