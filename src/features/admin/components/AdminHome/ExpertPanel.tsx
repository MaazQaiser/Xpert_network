'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Button, IconButton } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import { CountryFlag } from '@/shared/ui';
import styles from './ReportPanel.module.scss';

const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';

export type PanelPerson = {
  id: string;
  name: string;
  photoUrl?: string;
  role: string;
  country?: string;
  /** Short facts after the country, e.g. "22 years". */
  facts: string[];
};

/**
 * Home chat: one expert, in a panel that slides in from the right so the table stays in view.
 * The header is always the person (portrait, name, a tag, role, facts); the body is whatever the
 * step needs. Previous and Next step through the list; Esc, the scrim or Close put it away and
 * return focus to the row that opened it.
 */
export function ExpertPanel({
  person,
  label,
  tag,
  variant = 'compact',
  action,
  position,
  total,
  onStep,
  onClose,
  children,
}: {
  person: PanelPerson;
  /** The dialog's accessible name, e.g. "Ryan Foster’s report". */
  label: string;
  /** A verdict beside the name, e.g. the answer quality or the match. */
  tag?: ReactNode;
  /** 'profile' gives the person a large portrait and room for an action, like a profile card. */
  variant?: 'compact' | 'profile';
  /** An action on the right of the profile header, level with the facts, e.g. View LinkedIn profile. */
  action?: ReactNode;
  /** Where this expert sits in the list (0-based), for Previous and Next. */
  position: number;
  total: number;
  onStep: (step: -1 | 1) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);

  // Focus moves in on open and back to whatever opened it on close; the page stops scrolling.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // The panel itself takes focus, so the Close tooltip doesn't pop up on open.
    panel.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  // Esc closes wherever focus is.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, []);

  // Tab stays inside the panel.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const initials = person.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return createPortal(
    <div className={styles.layer}>
      <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
      <aside
        ref={panel}
        id={`panel-${person.id}`}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {variant === 'profile' ? (
          <header className={styles.profileHead}>
            <span className={styles.bigAvatar} aria-hidden="true">
              {person.photoUrl ? (
                <Image
                  src={person.photoUrl}
                  alt=""
                  width={72}
                  height={72}
                  className={styles.photo}
                />
              ) : (
                initials
              )}
            </span>
            <div className={styles.profileText}>
              <div className={styles.nameRow}>
                <h2 className={styles.profileName}>{person.name}</h2>
                {tag}
              </div>
              <p className={styles.role}>{person.role}</p>
            </div>
            <IconButton
              kind="ghost"
              size="lg"
              label="Close"
              align="left"
              className={`${styles.close} ${styles.profileClose}`}
              onClick={onClose}
            >
              <Close size={24} />
            </IconButton>
            {/* The facts on the left, the action on the right, under the name. */}
            <div className={styles.profileMeta}>
              {person.country || person.facts.length > 0 ? (
                <p className={styles.facts}>
                  {person.country ? <CountryFlag code={person.country} size="sm" /> : null}
                  {person.facts.map((fact) => (
                    <span key={fact} className={styles.fact}>
                      {fact}
                    </span>
                  ))}
                </p>
              ) : null}
              {action}
            </div>
          </header>
        ) : (
          <header className={styles.head}>
            <span className={styles.avatar} aria-hidden="true">
              {person.photoUrl ? (
                <Image
                  src={person.photoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className={styles.photo}
                />
              ) : (
                initials
              )}
            </span>
            <div className={styles.headText}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{person.name}</h2>
                {tag}
              </div>
              <p className={styles.role}>{person.role}</p>
              <p className={styles.facts}>
                {person.country ? <CountryFlag code={person.country} size="sm" /> : null}
                {person.facts.map((fact) => (
                  <span key={fact} className={styles.fact}>
                    {fact}
                  </span>
                ))}
              </p>
            </div>
            <IconButton
              kind="ghost"
              size="lg"
              label="Close"
              align="left"
              className={styles.close}
              onClick={onClose}
            >
              <Close size={24} />
            </IconButton>
          </header>
        )}

        <div className={styles.body}>{children}</div>

        <footer className={styles.foot}>
          <Button kind="ghost" size="md" disabled={position <= 0} onClick={() => onStep(-1)}>
            Previous
          </Button>
          <span className={styles.count}>
            {position + 1} of {total}
          </span>
          <Button kind="ghost" size="md" disabled={position >= total - 1} onClick={() => onStep(1)}>
            Next
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
