'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, InlineNotification, SkeletonText } from '@carbon/react';
import { CheckmarkFilled } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useBooking, useBookingAction, useProject } from '../../api/queries';
import type { TimeSlot } from '../../model/availability.schema';
import { FlowToast } from './AnswerToast';
import chat from './ChatBlocks.module.scss';
import styles from './BookMeetings.module.scss';

/** "Wed 28 Oct · 15:00" in GMT, the way the client wrote the time. */
function slotLabel(slot: TimeSlot): string {
  const date = new Date(slot.startsAt);
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} · ${time}`;
}

/**
 * The client's reply in the chat: who they picked, then one yes that books the meetings
 * and points at the calendar.
 */
export function BookMeetings({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useProject(projectId);
  const booking = useBooking(projectId);
  const act = useBookingAction(projectId);
  const [error, setError] = useState<unknown>(null);
  const [toast, setToast] = useState(false);

  if (project.isPending || booking.isPending) return <SkeletonText paragraph lineCount={3} />;
  if (!project.data || !booking.data) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The reply didn’t load."
        subtitle={toUserMessage(project.error ?? booking.error)}
      />
    );
  }

  const data = booking.data;
  const client = data.client.name.split(' ')[0] ?? data.client.name;
  const booked = data.stage === 'booked';

  const book = async () => {
    setError(null);
    try {
      const synced = await act.mutateAsync({
        action: 'sync',
        standbyIds: data.notPicked
          .filter((expert) => expert.standby)
          .map((expert) => expert.expertId),
      });
      const { subject, intro, closing, attachInvites, revealNames } = synced.message;
      await act.mutateAsync({
        action: 'lock',
        message: { subject, intro, closing, attachInvites, revealNames },
      });
      setToast(true);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <div className={styles.book}>
      <article className={chat.card} aria-label={`Reply from ${data.client.name}`}>
        <header className={chat.cardHead}>
          <div className={chat.pickBody}>
            <p className={chat.pickFrom}>
              {data.client.name}
              <span className={chat.pickCompany}> · {data.client.company}</span>
            </p>
            <p className={chat.pickSubject}>{data.reply.subject}</p>
          </div>
        </header>
        <p className={styles.body}>{data.reply.body}</p>
        <ul className={styles.picks} aria-label="Experts they picked">
          {data.picks.map((pick) => (
            <li key={pick.expertId}>
              <strong>{pick.name}</strong>
              <span>
                {pick.role} · {slotLabel(pick.slot)}
              </span>
            </li>
          ))}
        </ul>
      </article>

      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="The meetings didn’t book."
          subtitle={toUserMessage(error)}
          onCloseButtonClick={() => setError(null)}
        />
      ) : null}

      {booked ? (
        <div className={styles.done}>
          <p role="status">
            <CheckmarkFilled aria-hidden={true} />
            <span>
              Booked for <strong>{project.data.name}</strong>. The calls are on your calendar.
            </span>
          </p>
          <Button as={Link} href={routes.admin.scheduling}>
            View your calendar
          </Button>
        </div>
      ) : (
        <div className={styles.done}>
          <p>
            Book {data.picks.length === 1 ? 'this meeting' : `these ${data.picks.length} meetings`}{' '}
            with {client}?
          </p>
          <Button disabled={act.isPending} onClick={() => void book()}>
            {act.isPending ? 'Booking…' : 'Yes, book the meetings'}
          </Button>
        </div>
      )}

      {toast ? (
        <FlowToast
          label="Meetings booked"
          title={`Meetings booked for ${project.data.name}`}
          action="View your calendar"
          onAction={() => router.push(routes.admin.scheduling)}
          onClose={() => setToast(false)}
        />
      ) : null}
    </div>
  );
}
