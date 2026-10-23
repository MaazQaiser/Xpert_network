'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Tag } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import type { CallSession } from '../../model/call.schema';
import styles from './CallEnded.module.scss';

// How long the hop plays when the mascot is clicked (matches the CSS).
const HOP_MS = 900;

/** "1935" → "32 minutes". */
function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** 1935 → "00:32:15". */
function clockLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Screen 14 → full-screen "call ended" moment: the mascot drops in and waves, then the PM goes
 * home or stays to review the after-call items.
 */
export function CallEnded({ session, onReview }: { session: CallSession; onReview: () => void }) {
  const [isHopping, setIsHopping] = useState(false);
  const homeRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const duration = session.duration ?? 0;
  const client = session.client.name.split(' ')[0] ?? session.client.name;
  const accepted = session.requests.filter((r) => r.status === 'accepted').length;

  // Focus the main action, and keep the page behind from scrolling while this is open.
  useEffect(() => {
    homeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!isHopping) return;
    const timer = window.setTimeout(() => setIsHopping(false), HOP_MS);
    return () => window.clearTimeout(timer);
  }, [isHopping]);

  // Escape stays on the call page; Tab cycles inside the dialog.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onReview();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-ended-title"
      aria-describedby="call-ended-text"
      onKeyDown={onKeyDown}
    >
      <div className={styles.content}>
        <button
          type="button"
          className={styles.mascot}
          data-hop={isHopping || undefined}
          aria-label="Celebrate with the assistant"
          onClick={() => setIsHopping(true)}
        >
          <span className={styles.ring} aria-hidden="true" />
          <Image
            src="/images/assistant-mascot.png"
            alt=""
            width={112}
            height={128}
            priority
            className={styles.mascotImage}
          />
        </button>

        <Tag type="gray" size="md" className={styles.tag}>
          Call ended · {clockLabel(duration)}
        </Tag>
        <h1 id="call-ended-title" className={styles.title}>
          Your call has ended
        </h1>
        <p id="call-ended-text" className={styles.text}>
          The call with {session.expert.name} (Expert {session.expert.letter}) and {client} lasted{' '}
          {minutesLabel(duration)}. The transcript is saved, and the AI is drafting the call summary
          for {client}.
        </p>

        <ul className={styles.notes} aria-label="What happens next">
          <li>Review the after-call documents, then send them to {client}.</li>
          {accepted > 0 ? (
            <li>
              {accepted} client request{accepted === 1 ? ' is' : 's are'} lined up from the call.
            </li>
          ) : null}
          <li>Mark {session.expert.name.split(' ')[0]} as paid once the call is approved.</li>
        </ul>

        <div className={styles.actions}>
          <Button ref={homeRef} as={Link} href={routes.admin.home} renderIcon={ArrowRight}>
            Go to Home
          </Button>
          <Button kind="ghost" onClick={onReview}>
            Review the call
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
