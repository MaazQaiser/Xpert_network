'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, InlineNotification, Tag } from '@carbon/react';
import { ArrowRight, CheckmarkFilled, CircleDash, Unlocked } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { StatusTag } from '@/shared/ui';
import { useBookingAction } from '../../api/queries';
import type { Booking, BookingPick } from '../../model/booking.schema';
import type { Project } from '../../model/project.schema';
import {
  Avatar,
  BookingBoundary,
  BookingCrumbs,
  NotYet,
  dayLabel,
  slotLabel,
  timeLabel,
} from './bookingParts';
import styles from './Booking.module.scss';

const QUESTIONS_PREVIEW = 3;

/** PRD screen 13: the calls are booked, the AI's sync checklist and the expert's briefing pack. */
export function Booked({ projectId }: { projectId: string }) {
  return (
    <BookingBoundary projectId={projectId} current="booking">
      {(project, booking) =>
        booking.stage === 'booked' ? (
          <BookedView project={project} booking={booking} />
        ) : (
          <NotYet
            project={project}
            current="booking"
            title="Nothing is booked yet"
            description="Send the client the confirmed times and lock the project first."
            href={routes.admin.projectStep(
              project.id,
              booking.stage === 'picked' ? 'pick' : 'sync',
            )}
            label={
              booking.stage === 'picked' ? 'Go to the client’s picks' : 'Go to sync with experts'
            }
          />
        )
      }
    </BookingBoundary>
  );
}

function BookedView({ project, booking }: { project: Project; booking: Booking }) {
  const router = useRouter();
  const action = useBookingAction(project.id);
  const calls = [...booking.picks].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));
  const [selectedId, setSelectedId] = useState(calls[0]?.expertId ?? '');
  const [allQuestions, setAllQuestions] = useState(false);
  const selected = calls.find((c) => c.expertId === selectedId) ?? calls[0];
  const first = booking.client.name.split(' ')[0] ?? booking.client.name;
  const count = calls.length;
  const days = [...new Set(calls.map((c) => dayLabel(c.slot.startsAt)))];
  const daysText = days.length > 1 ? `${days.slice(0, -1).join(', ')} & ${days.at(-1)}` : days[0];
  const done = booking.checklist.filter((c) => c.doneAt).length;
  const questions = allQuestions
    ? booking.briefing.questions
    : booking.briefing.questions.slice(0, QUESTIONS_PREVIEW);

  const unlock = () =>
    action.mutate(
      { action: 'unlock' },
      { onSuccess: () => router.push(routes.admin.projectStep(project.id, 'sync')) },
    );

  return (
    <div className={styles.root}>
      <BookingCrumbs project={project} current="booking" />

      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.meta}>
            <StatusTag tone="success" size="sm" label="Booked" />
            <Tag type="gray" size="sm">
              Project locked · {booking.version}
            </Tag>
          </div>
          <h1 className={styles.title}>
            {first} picked {count} expert{count > 1 ? 's' : ''} — call{count > 1 ? 's' : ''}{' '}
            {daysText}
          </h1>
          <p className={styles.subtitle}>
            Client confirmed at {formatTime(booking.reply.receivedAt)} today. AI synced everyone and
            locked the project scope.
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            as={Link}
            href={routes.admin.projectStep(project.id, 'responses')}
            kind="tertiary"
          >
            Book another expert
          </Button>
          <Button
            as={Link}
            href={routes.admin.projectStep(project.id, 'call')}
            renderIcon={ArrowRight}
          >
            Open call workspace
          </Button>
        </div>
      </header>

      {action.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="The project didn’t unlock."
          subtitle={toUserMessage(action.error)}
          onClose={() => action.reset()}
        />
      ) : null}

      <div className={styles.layout}>
        <div className={styles.column}>
          {selected ? <CallDetails booking={booking} call={selected} /> : null}

          <section className={styles.card} aria-labelledby="checklist-title">
            <div className={styles.cardHeader}>
              <AIExplainLabel aria-label="Sync checklist" />
              <h2 id="checklist-title" className={styles.cardTitle}>
                Sync checklist
              </h2>
              <span className={styles.cardMeta}>
                {done} of {booking.checklist.length} done automatically
              </span>
            </div>
            <ol className={styles.checklist}>
              {booking.checklist.map((item) => (
                <li key={item.label} className={item.doneAt ? styles.checkDone : undefined}>
                  {item.doneAt ? (
                    <CheckmarkFilled aria-label="Done" className={styles.checkIcon} />
                  ) : (
                    <CircleDash aria-label="Scheduled" className={styles.checkIcon} />
                  )}
                  <span className={styles.checkLabel}>{item.label}</span>
                  <span className={styles.rowMeta}>
                    {item.doneAt
                      ? formatTime(item.doneAt)
                      : item.scheduledFor
                        ? `Scheduled · ${slotLabel(item.scheduledFor)}`
                        : 'Scheduled'}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.quietCard} aria-labelledby="locked-title">
            <h2 id="locked-title" className={styles.cardTitle}>
              What “locked” means
            </h2>
            <p className={styles.cardText}>
              Scope, experts and the {booking.questionTopics.length} client questions are frozen as{' '}
              <strong>{booking.version}</strong>. Changes from now on (for example, a client asks to
              drop a question) are tracked as new versions, so nothing gets lost.
            </p>
            <div>
              <Button
                kind="tertiary"
                size="md"
                renderIcon={Unlocked}
                disabled={action.isPending}
                onClick={unlock}
              >
                Unlock to edit
              </Button>
            </div>
          </section>
        </div>

        <div className={styles.column}>
          {selected ? (
            <section className={styles.card} aria-labelledby="briefing-title">
              <div className={styles.cardHeader}>
                <AIExplainLabel aria-label="Briefing pack" />
                <h2 id="briefing-title" className={styles.cardTitle}>
                  Briefing pack for {selected.name.split(' ')[0]}
                </h2>
              </div>
              <p className={styles.cardText}>Client name hidden. Sent 24 h before the call.</p>
              <div className={styles.briefing}>
                <h3 className={styles.subTitle}>Context</h3>
                <p>{booking.briefing.context}</p>
                {selected.note ? (
                  <>
                    <h3 className={styles.subTitle}>Client’s request for this call</h3>
                    <p>Please cover {selected.note}.</p>
                  </>
                ) : null}
                <h3 className={styles.subTitle}>
                  Questions to prepare ({booking.briefing.questions.length})
                </h3>
                <ol className={styles.numbered}>
                  {questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
                {booking.briefing.questions.length > QUESTIONS_PREVIEW ? (
                  <div>
                    <Button kind="ghost" size="sm" onClick={() => setAllQuestions((v) => !v)}>
                      {allQuestions
                        ? 'Show fewer'
                        : `Show ${booking.briefing.questions.length - QUESTIONS_PREVIEW} more`}
                    </Button>
                  </div>
                ) : null}
                <h3 className={styles.subTitle}>Do not share</h3>
                <p>{booking.briefing.doNotShare}</p>
              </div>
            </section>
          ) : null}

          <section className={styles.card} aria-labelledby="calls-title">
            <h2 id="calls-title" className={styles.cardTitle}>
              Calls on this project
            </h2>
            <ul className={styles.callList}>
              {calls.map((call) => (
                <li key={call.expertId}>
                  <button
                    type="button"
                    className={styles.callButton}
                    aria-pressed={call.expertId === selected?.expertId}
                    onClick={() => setSelectedId(call.expertId)}
                  >
                    <Avatar name={call.name} photoUrl={call.photoUrl} size="sm" />
                    <span className={styles.rowBody}>
                      <strong className={styles.callName}>{call.name}</strong>
                      <span className={styles.rowMeta}>
                        Expert {call.letter} · {slotLabel(call.slot.startsAt)}
                      </span>
                    </span>
                    <StatusTag tone="success" size="sm" label="Booked" />
                  </button>
                </li>
              ))}
              {booking.notPicked.map((expert) => (
                <li key={expert.expertId} className={styles.callIdle}>
                  <Avatar name={expert.name} photoUrl={expert.photoUrl} size="sm" />
                  <span className={styles.rowBody}>
                    <strong className={styles.callName}>{expert.name}</strong>
                    <span className={styles.rowMeta}>Expert {expert.letter} · not picked</span>
                  </span>
                  <StatusTag
                    tone="neutral"
                    size="sm"
                    label={expert.standby ? 'Standby' : 'Released'}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function CallDetails({ booking, call }: { booking: Booking; call: BookingPick }) {
  const end = new Date(new Date(call.slot.startsAt).getTime() + 60 * 60 * 1000).toISOString();
  const fields: [string, string][] = [
    ['Client', `${booking.client.name}, ${booking.client.company}`],
    ['Expert', `${call.name} (Expert ${call.letter})`],
    [
      'When',
      `${dayLabel(call.slot.startsAt)} · ${timeLabel(call.slot.startsAt)}–${timeLabel(end)} GMT`,
    ],
    ['Where', booking.call.where],
    ['Moderator', booking.call.moderator],
    ['Rate', call.rateHint ? `${call.rateHint}/h` : 'Not set'],
    ['Recording', booking.call.recording],
    ['Reminders', booking.call.reminders],
  ];
  return (
    <section className={styles.card} aria-labelledby="call-title">
      <h2 id="call-title" className={styles.cardTitle}>
        Call with {call.name}
      </h2>
      <dl className={styles.details}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
