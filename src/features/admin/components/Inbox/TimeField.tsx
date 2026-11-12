'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Popover, PopoverContent, TimePicker } from '@carbon/react';
import styles from './TimeField.module.scss';

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/**
 * A 24-hour time (00:00 to 23:59) you can type, or pick from an hours list and a minutes list
 * that open when the field is clicked.
 */
export function TimeField({
  id,
  label,
  value,
  onChange,
  onBlur,
  disabled = false,
  invalid = false,
  invalidText,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  invalidText?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const lists = useRef<HTMLDivElement>(null);
  const [hour = '00', minute = '00'] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : [];
  const isOpen = open && !disabled;

  // Show the chosen hour and minute when the lists open, not 00 at the top.
  useEffect(() => {
    if (!isOpen) return;
    lists.current
      ?.querySelectorAll<HTMLElement>('[aria-pressed="true"]')
      .forEach((el) => el.scrollIntoView?.({ block: 'center' }));
  }, [isOpen]);

  const close = () => setOpen(false);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape' && isOpen) {
      // Close the lists, not the dialog around them.
      event.stopPropagation();
      close();
    }
  };

  return (
    <Popover
      as="div"
      open={isOpen}
      align="bottom-start"
      autoAlign
      caret={false}
      border
      onRequestClose={close}
      className={styles.field}
    >
      <TimePicker
        id={id}
        labelText={label}
        hideLabel
        placeholder="hh:mm"
        maxLength={5}
        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
        // An input that opens a popup of choices: a combobox (WAI-ARIA 1.2).
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${id}-lists`}
        disabled={disabled}
        value={value}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onBlur?.()}
        invalid={invalid}
        invalidText={invalidText}
      />
      <PopoverContent>
        <div ref={lists} id={`${id}-lists`} className={styles.lists}>
          <TimeList
            label={`${label}, hour`}
            options={HOURS}
            selected={hour}
            onPick={(h) => onChange(`${h}:${minute}`)}
          />
          <TimeList
            label={`${label}, minute`}
            options={MINUTES}
            selected={minute}
            onPick={(m) => {
              onChange(`${hour}:${m}`);
              close();
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeList({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: string[];
  selected: string;
  onPick: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className={styles.list}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          aria-pressed={option === selected}
          onClick={() => onPick(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
