'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ActionableNotification,
  Button,
  Checkbox,
  InlineNotification,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { StatusTag } from '@/shared/ui';
import { useBookingAction } from '../../api/queries';
import {
  bookingMessageInputSchema,
  type Booking,
  type BookingMessageInput,
} from '../../model/booking.schema';
import type { Project } from '../../model/project.schema';
import { Avatar, BookingBoundary, BookingCrumbs, NotYet, slotLabel } from './bookingParts';
import styles from './Booking.module.scss';

/** PRD screen 12: the experts confirmed the client's times; tell the client and lock the project. */
export function SyncExperts({ projectId }: { projectId: string }) {
  return (
    <BookingBoundary projectId={projectId} current="sync">
      {(project, booking) =>
        booking.stage === 'picked' ? (
          <NotYet
            project={project}
            current="sync"
            title="The experts haven’t been synced yet"
            description="Sync the client’s picks with the experts first. Then the AI drafts the message to the client here."
            href={routes.admin.projectStep(project.id, 'pick')}
            label="Go to the client’s picks"
          />
        ) : (
          <SyncView project={project} booking={booking} />
        )
      }
    </BookingBoundary>
  );
}

function SyncView({ project, booking }: { project: Project; booking: Booking }) {
  const router = useRouter();
  const action = useBookingAction(project.id);
  const { message } = booking;
  const [input, setInput] = useState<BookingMessageInput>({
    subject: message.subject,
    intro: message.intro,
    closing: message.closing,
    attachInvites: message.attachInvites,
    revealNames: message.revealNames,
  });
  const [saved, setSaved] = useState<string | null>(null);

  const first = booking.client.name.split(' ')[0] ?? booking.client.name;
  const count = booking.picks.length;
  const isBooked = booking.stage === 'booked';
  const lastConfirmed = booking.picks
    .map((p) => p.confirmedAt ?? '')
    .sort()
    .at(-1);
  const check = bookingMessageInputSchema.safeParse(input);
  const fieldError = (field: 'subject' | 'intro' | 'closing') =>
    check.success ? undefined : check.error.issues.find((i) => i.path[0] === field)?.message;
  const isShort = input.intro === message.short.intro && input.closing === message.short.closing;
  const isAiCopy =
    isShort || (input.intro === message.ai.intro && input.closing === message.ai.closing);
  const set = (patch: Partial<BookingMessageInput>) => setInput((i) => ({ ...i, ...patch }));
  const calls = [...booking.picks].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));
  const released = booking.notPicked.filter((e) => !e.standby);
  const kept = booking.notPicked.filter((e) => e.standby);

  const save = () =>
    action.mutate(
      { action: 'save_message', message: input },
      { onSuccess: (next) => setSaved(next.messageSavedAt) },
    );
  const lock = () =>
    action.mutate(
      { action: 'lock', message: input },
      { onSuccess: () => router.push(routes.admin.projectStep(project.id, 'booking')) },
    );

  return (
    <div className={styles.root}>
      <BookingCrumbs project={project} current="sync" />

      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.meta}>
            <Tag type="green" size="sm">
              {count > 1 ? 'Both experts' : 'Expert'} confirmed
              {lastConfirmed ? ` · ${formatTime(lastConfirmed)}` : ''}
            </Tag>
          </div>
          <h1 className={styles.title}>Tell {first} the calls are locked</h1>
          <p className={styles.subtitle}>
            We checked {first}’s picks with {count > 1 ? 'both experts' : 'the expert'}. Once you
            send this message, the times are locked and the project moves to booked.
          </p>
        </div>
        <div className={styles.actions}>
          {isBooked ? (
            <Button as={Link} href={routes.admin.projectStep(project.id, 'booking')}>
              View booking
            </Button>
          ) : (
            <>
              <Button kind="tertiary" disabled={action.isPending} onClick={save}>
                Save draft
              </Button>
              <Button disabled={!check.success || action.isPending} onClick={lock}>
                Send to {first} & lock project
              </Button>
            </>
          )}
        </div>
      </header>

      {saved ? (
        <ActionableNotification
          inline
          kind="success"
          role="status"
          lowContrast
          hasFocus={false}
          title={`Draft saved at ${formatTime(saved)}.`}
          onClose={() => setSaved(null)}
        />
      ) : null}
      {action.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t go through."
          subtitle={toUserMessage(action.error)}
          onClose={() => action.reset()}
        />
      ) : null}

      <div className={styles.layoutWide}>
        <section className={styles.card} aria-labelledby="synced-title">
          <div>
            <h2 id="synced-title" className={styles.cardTitle}>
              Synced with experts
            </h2>
            <p className={styles.cardText}>
              AI messaged each expert by email + SMS to confirm {first}’s time.
            </p>
          </div>
          <ul className={styles.rows}>
            {booking.picks.map((pick) => (
              <li key={pick.expertId} className={styles.row}>
                <Avatar name={pick.name} photoUrl={pick.photoUrl} />
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>
                    <strong className={styles.name}>{pick.name}</strong>
                    <span className={styles.rowMeta}>Expert {pick.letter}</span>
                  </p>
                  <p className={styles.rowMeta}>
                    {slotLabel(pick.slot.startsAt)} GMT
                    {pick.note ? ` · ${pick.note} added to the brief` : ''}
                  </p>
                </div>
                {pick.confirmedAt ? (
                  <StatusTag
                    tone="success"
                    size="sm"
                    label={`Confirmed ${formatTime(pick.confirmedAt)}`}
                  />
                ) : null}
              </li>
            ))}
            {booking.notPicked.length > 0 ? (
              <li className={styles.row}>
                <span className={styles.avatarEmpty} aria-hidden="true">
                  –
                </span>
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>
                    <strong className={styles.name}>
                      Expert{booking.notPicked.length > 1 ? 's' : ''}{' '}
                      {booking.notPicked.map((e) => e.letter).join(', ')}
                    </strong>
                  </p>
                  <p className={styles.rowMeta}>
                    {released.length === 0
                      ? 'Not picked · kept on standby'
                      : kept.length === 0
                        ? 'Not picked · holds released'
                        : `${released.map((e) => e.letter).join(' and ')} released · ${kept.map((e) => e.letter).join(' and ')} on standby`}
                  </p>
                </div>
                <StatusTag
                  tone="neutral"
                  size="sm"
                  label={released.length === 0 ? 'Standby' : 'Released'}
                />
              </li>
            ) : null}
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="message-title">
          <div className={styles.cardHeader}>
            <AIExplainLabel
              aria-label="Message to the client"
              isEdited={!isAiCopy && !isBooked}
              onRevert={() => set(message.ai)}
            />
            <h2 id="message-title" className={styles.cardTitle}>
              Message to {first}
            </h2>
            {!isBooked ? (
              <Button
                kind="ghost"
                size="sm"
                className={styles.headerEnd}
                onClick={() => set(isShort ? message.ai : message.short)}
              >
                {isShort ? 'Longer' : 'Shorter'}
              </Button>
            ) : null}
          </div>

          <p className={styles.recipient}>
            <span className={styles.fieldLabel}>To</span>
            {booking.client.name} · {booking.client.email}
          </p>
          <TextInput
            id="lock-subject"
            labelText="Subject"
            value={input.subject}
            disabled={isBooked}
            onChange={(event) => set({ subject: event.target.value })}
            invalid={Boolean(fieldError('subject'))}
            invalidText={fieldError('subject')}
          />
          <TextArea
            id="lock-intro"
            labelText="Opening"
            rows={3}
            value={input.intro}
            disabled={isBooked}
            onChange={(event) => set({ intro: event.target.value })}
            invalid={Boolean(fieldError('intro'))}
            invalidText={fieldError('intro')}
          />

          {/* The calls themselves come from the confirmed times, so they can't drift. */}
          <ul className={styles.callsTable} aria-label="Calls in the message">
            {calls.map((pick) => (
              <li key={pick.expertId}>
                <strong>
                  {input.revealNames ? pick.name : `Expert ${pick.letter}`} · {pick.role}
                </strong>
                <span>{slotLabel(pick.slot.startsAt)} GMT</span>
              </li>
            ))}
          </ul>

          <TextArea
            id="lock-closing"
            labelText="Closing"
            rows={6}
            value={input.closing}
            disabled={isBooked}
            onChange={(event) => set({ closing: event.target.value })}
            invalid={Boolean(fieldError('closing'))}
            invalidText={fieldError('closing')}
          />
          <div className={styles.checksRow}>
            <Checkbox
              id="attach-invites"
              labelText="Attach calendar invites"
              checked={input.attachInvites}
              disabled={isBooked}
              onChange={(_, { checked }) => set({ attachInvites: checked })}
            />
            <Checkbox
              id="reveal-names"
              labelText="Reveal expert names now"
              checked={input.revealNames}
              disabled={isBooked}
              onChange={(_, { checked }) => set({ revealNames: checked })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
