'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Button, CopyButton, IconButton, Tag } from '@carbon/react';
import { Close, Folder, Launch, Time, UserMultiple, Video } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import type { Meeting, SchedulePerson, ScheduleProject } from '../../model/schedule.schema';
import { formatLongDate, formatTime } from './dates';
import styles from './Scheduling.module.scss';

/** The card's width in px, to decide which side of the meeting it opens on. */
const CARD_PX = 400;
const GAP_PX = 12;

function Avatar({ person }: { person: SchedulePerson }) {
  const initials = person.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span className={styles.avatar} aria-hidden="true">
      {person.photoUrl ? (
        <Image src={person.photoUrl} alt="" width={32} height={32} className={styles.photo} />
      ) : (
        initials
      )}
    </span>
  );
}

/**
 * A meeting's details in a small card beside it, like Google Calendar's: when, which project,
 * the Google Meet link with Join and Copy, and who's on the call. Esc, Close or a click
 * outside put it away and focus returns to the meeting.
 */
export function MeetingPreview({
  meeting,
  project,
  anchor,
  onClose,
}: {
  meeting: Meeting;
  project: ScheduleProject | undefined;
  anchor: HTMLElement;
  onClose: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const start = new Date(meeting.startsAt);
  const end = new Date(meeting.endsAt);
  const titleId = `meeting-title-${meeting.id}`;
  const isBooked = meeting.kind === 'booked';

  // Beside the meeting: to its right when there's room, else to its left; kept on screen.
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = card.current?.offsetHeight ?? 0;
      const fitsRight = rect.right + GAP_PX + CARD_PX <= window.innerWidth - GAP_PX;
      const left = fitsRight ? rect.right + GAP_PX : Math.max(GAP_PX, rect.left - GAP_PX - CARD_PX);
      const top = Math.min(
        Math.max(GAP_PX + 48, rect.top),
        Math.max(GAP_PX + 48, window.innerHeight - height - GAP_PX),
      );
      setPosition({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);

  // Focus moves into the card, and back to the meeting when it closes.
  useEffect(() => {
    card.current?.focus();
    return () => anchor.focus();
  }, [anchor]);

  // Esc or a click outside closes it.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (card.current?.contains(target) || anchor.contains(target)) return;
      close.current();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [anchor]);

  const colour = project?.colour ?? 'blue';
  const clientFirst = meeting.client.name.split(' ')[0] ?? meeting.client.name;

  return createPortal(
    <div
      ref={card}
      className={`${styles.preview} ${styles[colour]}`}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={
        position
          ? { insetBlockStart: position.top, insetInlineStart: position.left }
          : { visibility: 'hidden' }
      }
    >
      <div className={styles.previewTools}>
        <IconButton
          kind="ghost"
          size="sm"
          label="Open project"
          align="bottom"
          href={routes.admin.project(meeting.projectId)}
        >
          <Launch />
        </IconButton>
        <IconButton kind="ghost" size="sm" label="Close" align="bottom-right" onClick={onClose}>
          <Close />
        </IconButton>
      </div>

      <div className={styles.previewRow}>
        <span className={styles.swatch} aria-hidden="true" />
        <div>
          <h2 id={titleId} className={styles.previewTitle}>
            {isBooked ? 'Expert call' : 'Held slot'}: {meeting.expert.name} ×{' '}
            {meeting.client.detail}
          </h2>
          <p className={styles.previewWhen}>
            {formatLongDate(start)} · {formatTime(start)} – {formatTime(end)} GMT
          </p>
          {isBooked ? null : (
            <Tag type="outline" size="sm" className={styles.previewTag}>
              Awaiting {clientFirst}’s pick
            </Tag>
          )}
        </div>
      </div>

      <div className={styles.previewRow}>
        <Folder className={styles.previewIcon} aria-hidden={true} />
        <Link href={routes.admin.project(meeting.projectId)} className={styles.previewLink}>
          {project?.name ?? meeting.projectId}
        </Link>
      </div>

      {isBooked && meeting.meetUrl ? (
        <div className={styles.previewRow}>
          <Video className={styles.previewIcon} aria-hidden={true} />
          <div className={styles.meet}>
            <Button
              size="md"
              href={meeting.meetUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.joinButton}
            >
              Join with Google Meet
              <span className="cds--visually-hidden"> (opens in a new tab)</span>
            </Button>
            <span className={styles.meetLink}>
              <span>{meeting.meetUrl.replace('https://', '')}</span>
              <CopyButton
                iconDescription="Copy the Meet link"
                feedback="Copied"
                align="bottom"
                onClick={() => void navigator.clipboard?.writeText(meeting.meetUrl ?? '')}
              />
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.previewRow}>
          <Time className={styles.previewIcon} aria-hidden={true} />
          <p className={styles.previewNote}>
            Held with the expert until {clientFirst} picks a time. The Meet link goes out when the
            call is booked.
          </p>
        </div>
      )}

      <div className={styles.previewRow}>
        <UserMultiple className={styles.previewIcon} aria-hidden={true} />
        <div className={styles.guests}>
          <p className={styles.guestsTitle}>2 guests</p>
          <ul>
            {[
              { person: meeting.client, role: 'Client' },
              { person: meeting.expert, role: 'Expert' },
            ].map(({ person, role }) => (
              <li key={role} className={styles.guest}>
                <Avatar person={person} />
                <span className={styles.guestText}>
                  <span className={styles.guestName}>{person.name}</span>
                  <span className={styles.guestDetail}>
                    {role} · {person.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
