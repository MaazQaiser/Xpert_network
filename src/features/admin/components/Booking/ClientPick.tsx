'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, InlineNotification, Tag } from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { useBookingAction } from '../../api/queries';
import type { Booking } from '../../model/booking.schema';
import type { Project } from '../../model/project.schema';
import { senderPhoto } from '../inboxDisplay';
import { Avatar, BookingBoundary, BookingCrumbs, dayLabel, timeLabel } from './bookingParts';
import styles from './Booking.module.scss';

/** PRD screen 11: the client's reply with their picks, read by the AI, ready to sync. */
export function ClientPick({ projectId }: { projectId: string }) {
  return (
    <BookingBoundary projectId={projectId} current="pick">
      {(project, booking) => <PickView project={project} booking={booking} />}
    </BookingBoundary>
  );
}

function PickView({ project, booking }: { project: Project; booking: Booking }) {
  const router = useRouter();
  const action = useBookingAction(project.id);
  const [standby, setStandby] = useState(
    booking.notPicked.filter((e) => e.standby).map((e) => e.expertId),
  );
  const first = booking.client.name.split(' ')[0] ?? booking.client.name;
  const count = booking.picks.length;
  const isSynced = booking.stage !== 'picked';

  const sync = () =>
    action.mutate(
      { action: 'sync', standbyIds: standby },
      { onSuccess: () => router.push(routes.admin.projectStep(project.id, 'sync')) },
    );

  return (
    <div className={styles.root}>
      <BookingCrumbs project={project} current="pick" />

      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.meta}>
            <Tag type="blue" size="sm">
              Email from {first} · {formatTime(booking.reply.receivedAt)}
            </Tag>
            <span className={styles.metaText}>
              Reply to “{booking.reply.subject.replace(/^Re: /, '')}”
            </span>
          </div>
          <h1 className={styles.title}>
            {first} picked {count} expert{count > 1 ? 's' : ''}
          </h1>
        </div>
        <div className={styles.actions}>
          <Button
            as="a"
            href={`mailto:${booking.client.email}?subject=${encodeURIComponent(booking.reply.subject)}`}
            kind="tertiary"
          >
            Message {first}
          </Button>
          {isSynced ? (
            <Button
              as={Link}
              href={routes.admin.projectStep(
                project.id,
                booking.stage === 'booked' ? 'booking' : 'sync',
              )}
            >
              {booking.stage === 'booked' ? 'View booking' : 'Continue to message'}
            </Button>
          ) : (
            <Button disabled={action.isPending} onClick={sync}>
              {action.isPending ? 'Syncing…' : 'Sync with experts'}
            </Button>
          )}
        </div>
      </header>

      {action.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="The sync didn’t start."
          subtitle={toUserMessage(action.error)}
          onClose={() => action.reset()}
        />
      ) : null}

      <section className={styles.card} aria-labelledby="chosen-title">
        <h2 id="chosen-title" className={styles.cardTitle}>
          Chosen experts
        </h2>
        <ul className={styles.rows}>
          {booking.picks.map((pick) => (
            <li key={pick.expertId} className={styles.row}>
              <Avatar name={pick.name} photoUrl={pick.photoUrl} />
              <div className={styles.rowBody}>
                <p className={styles.rowTitle}>
                  <strong className={styles.name}>{pick.name}</strong>
                  <span className={styles.rowMeta}>Expert {pick.letter}</span>
                </p>
                <p className={styles.rowText}>{pick.role}</p>
                <p className={styles.rowMeta}>
                  Covers{' '}
                  {pick.covers
                    .map((q) => `Q${q + 1} ${booking.questionTopics[q] ?? ''}`)
                    .join(' · ')}
                </p>
              </div>
              <p className={styles.when}>
                <strong>
                  {dayLabel(pick.slot.startsAt)} · {timeLabel(pick.slot.startsAt)}
                </strong>
                <span className={styles.rowMeta}>GMT · 60 min</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="reply-title">
        <div className={styles.mailHead}>
          <Avatar name={booking.client.name} photoUrl={senderPhoto(booking.client.email)} />
          <div className={styles.rowBody}>
            <h2 id="reply-title" className={styles.mailFrom}>
              {booking.client.name} → {booking.reply.to}
            </h2>
            <p className={styles.rowMeta}>
              {booking.reply.subject} · Today {formatTime(booking.reply.receivedAt)}
            </p>
          </div>
          <span className={styles.aiNote}>
            <AIExplainLabel aria-label="AI read the picks" />
            AI read the picks
          </span>
        </div>
        <blockquote className={styles.quote}>“{booking.reply.body}”</blockquote>
      </section>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="next-title">
          <div className={styles.cardHeader}>
            <AIExplainLabel aria-label="Next steps" />
            <h2 id="next-title" className={styles.cardTitle}>
              Next steps
            </h2>
          </div>
          <ol className={styles.steps}>
            {booking.nextSteps.map((step) => (
              <li key={step.text}>
                {step.lead ? <strong>{step.lead} </strong> : null}
                {step.text}
              </li>
            ))}
          </ol>
        </section>

        {booking.notPicked.length > 0 ? (
          <section className={styles.card} aria-labelledby="not-picked-title">
            <h2 id="not-picked-title" className={styles.cardTitle}>
              Not picked
            </h2>
            <p className={styles.cardText}>
              Keep them on standby in case {first} wants more calls later. Untick to release their
              held slots.
            </p>
            <ul className={styles.standby}>
              {booking.notPicked.map((expert) => {
                const isStandby = standby.includes(expert.expertId);
                return (
                  <li key={expert.expertId}>
                    <Checkbox
                      id={`standby-${expert.expertId}`}
                      labelText={`${expert.name} · ${expert.role}`}
                      checked={isStandby}
                      disabled={isSynced}
                      onChange={(_, { checked }) =>
                        setStandby((ids) =>
                          checked
                            ? [...ids, expert.expertId]
                            : ids.filter((id) => id !== expert.expertId),
                        )
                      }
                    />
                    <span className={styles.rowMeta}>{isStandby ? 'Standby' : 'Release'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
