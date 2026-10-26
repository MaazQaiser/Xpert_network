'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ActionableNotification,
  Button,
  Checkbox,
  InlineLoading,
  InlineNotification,
  SelectableTag,
} from '@carbon/react';
import { ArrowRight, CircleDash } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { StatusTag } from '@/shared/ui';
import { useAvailability, useAvailabilityAction } from '../../api/queries';
import {
  AVAILABILITY_STATUS_LABELS,
  type Availability,
  type TimeSlot,
} from '../../model/availability.schema';
import type { Project } from '../../model/project.schema';
import type { ExpertResponse } from '../../model/responses.schema';
import { ChatClientEmail } from './ChatClientEmail';
import { StreamedAnswer } from './StreamedAnswer';
import search from './ExpertSearch.module.scss';
import styles from './ScreeningAnswers.module.scss';

/** How long each step shows before its check mark. */
const STEP_MS = 1600;
const TABLE_PAUSE_MS = 500;

/** "Tue 27 · 14:00" in the client's timezone (GMT). */
function slotLabel(slot: TimeSlot): string {
  const date = new Date(slot.startsAt);
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const dayOfMonth = date.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} ${dayOfMonth} · ${time}`;
}

/**
 * Home chat, after the PM confirms who moves forward: the AI asks those experts for their times
 * in the open, then shows the times they offered. The PM leaves out any time, then sends the
 * experts to the client; the AI then drafts the client email below, in the thread.
 */
export function ChatAvailability({
  project,
  expertIds,
  people,
}: {
  project: Project;
  expertIds: string[];
  /** The experts' screening answers, for their names and experience. */
  people: ExpertResponse[];
}) {
  const availability = useAvailability(project.id, expertIds);
  const [step, setStep] = useState(0);
  const outcome = useRef<HTMLDivElement>(null);
  const steps = [
    `Asking the ${expertIds.length} ${expertIds.length === 1 ? 'expert' : 'experts'} for their free times`,
    'Checking their compliance forms',
  ];

  // Tick the steps off; the last one waits for the times to arrive.
  useEffect(() => {
    if (availability.isError) return;
    if (step < steps.length - 1 || (step === steps.length - 1 && availability.data)) {
      const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, steps.length, availability.data, availability.isError]);

  const isDone = step >= steps.length && availability.data !== undefined;

  // Bring the times into view as they arrive.
  useEffect(() => {
    if (!isDone) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    outcome.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [isDone]);

  return (
    <section className={search.round} aria-label="Confirm availability">
      <ol className={search.steps} aria-live="polite">
        {steps.map((label, index) => (
          <li key={label}>
            {index < step ? (
              <InlineLoading status="finished" description={label} />
            ) : index === step && !availability.isError ? (
              <InlineLoading status="active" description={`${label}…`} />
            ) : (
              <span className={search.stepPending}>
                <CircleDash aria-hidden={true} />
                {label}
              </span>
            )}
          </li>
        ))}
      </ol>

      {availability.isError ? (
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          hasFocus={false}
          title="The experts’ times didn’t load."
          subtitle={toUserMessage(availability.error)}
          actionButtonLabel="Try again"
          onActionButtonClick={() => void availability.refetch()}
        />
      ) : null}

      <div ref={outcome} className={search.outcome}>
        {isDone ? (
          <OfferedTimes project={project} data={availability.data} people={people} />
        ) : null}
      </div>
    </section>
  );
}

function OfferedTimes({
  project,
  data,
  people,
}: {
  project: Project;
  data: Availability;
  people: ExpertResponse[];
}) {
  const action = useAvailabilityAction(project.id);
  // Every offered slot starts as a client option; clicking a slot takes it out or back in.
  const [chosen, setChosen] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(data.experts.map((e) => [e.expertId, e.slots.map((s) => s.id)])),
  );
  const [holdSlots, setHoldSlots] = useState(true);
  // Handed to the client: the email is drafted below, in the thread, and the times are fixed.
  const [isPrepared, setIsPrepared] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sentAt = data.sentToClientAt;
  const client = data.clientName;
  const clientFirst = client.split(' ')[0] ?? client;

  const confirmed = data.experts.filter((e) => e.status === 'confirmed').length;
  const waiting = data.experts.filter((e) => e.status === 'waiting').length;
  const ready = data.experts.filter(
    (e) => e.status === 'confirmed' && (chosen[e.expertId]?.length ?? 0) > 0,
  );
  const nameOf = (id: string, fallback: string) =>
    people.find((p) => p.expertId === id)?.name ?? fallback;

  const toggleSlot = (expertId: string, slotId: string, isOn: boolean) =>
    setChosen((current) => {
      const list = current[expertId] ?? [];
      return {
        ...current,
        [expertId]: isOn ? [...list, slotId] : list.filter((id) => id !== slotId),
      };
    });

  const send = () => {
    setError(null);
    action.mutate(
      {
        action: 'prepare_client',
        holdSlots,
        experts: ready.map((e) => ({ expertId: e.expertId, slotIds: chosen[e.expertId] ?? [] })),
      },
      {
        // The AI drafts the client email on the next screen; nothing is sent yet.
        onSuccess: () => setIsPrepared(true),
        onError: setError,
      },
    );
  };

  const intro = [
    `**${confirmed} of ${data.experts.length} experts** confirmed their times`,
    waiting > 0 ? `, and ${waiting} ${waiting === 1 ? 'is' : 'are'} still replying. ` : '. ',
    `Times are in ${clientFirst}’s timezone (${data.timeZone}). Every time goes to the client; select one to leave it out.`,
  ].join('');

  return (
    <div className={search.result}>
      <h4 className={search.resultTitle}>Offered times for {project.name}</h4>
      <StreamedAnswer className={search.resultIntro} pauseMs={TABLE_PAUSE_MS} text={intro}>
        <div className={styles.review}>
          <div className={search.tableScroll}>
            <table className={`${search.table} ${styles.timesTable}`} aria-label="Offered times">
              <thead>
                <tr>
                  <th scope="col">Expert</th>
                  <th scope="col">Offered slots</th>
                </tr>
              </thead>
              <tbody>
                {data.experts.map((expert) => {
                  const name = nameOf(expert.expertId, expert.label);
                  return (
                    <tr key={expert.expertId}>
                      <th scope="row" className={search.expertCell}>
                        <span className={search.expertName}>{name}</span>
                        <span className={styles.timesRole}>{expert.role}</span>
                        {expert.status !== 'confirmed' ? (
                          <span className={styles.timesStatus}>
                            <StatusTag
                              tone={expert.status === 'waiting' ? 'progress' : 'error'}
                              label={AVAILABILITY_STATUS_LABELS[expert.status]}
                              size="sm"
                            />
                          </span>
                        ) : null}
                      </th>
                      <td>
                        {expert.slots.length > 0 ? (
                          <div className={styles.slots} role="group" aria-label={`${name}’s times`}>
                            {expert.slots.map((slot) => (
                              <SelectableTag
                                key={slot.id}
                                id={`chat-${slot.id}`}
                                text={slotLabel(slot)}
                                size="md"
                                selected={chosen[expert.expertId]?.includes(slot.id) ?? false}
                                disabled={sentAt !== null || isPrepared}
                                onChange={(isOn: boolean) =>
                                  toggleSlot(expert.expertId, slot.id, isOn)
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <span className={styles.noSlots}>No times yet</span>
                        )}
                        {!expert.complianceSigned ? (
                          <p className={styles.warning}>Compliance form not signed</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* What happens next, and the one step to take. */}
          <article className={styles.ready} aria-labelledby={`ready-${project.id}`}>
            <h5 id={`ready-${project.id}`} className={styles.readyTitle}>
              {sentAt ? 'Sent to the client' : 'Ready for the client'}
            </h5>
            <p className={styles.readyText}>
              {sentAt ? (
                `These experts already went to ${client}. Their picks land in your Inbox.`
              ) : (
                <>
                  <strong>
                    {ready.length} {ready.length === 1 ? 'expert has' : 'experts have'}
                  </strong>{' '}
                  times to offer. Next, send them to {client} with their answers and free slots.
                </>
              )}
            </p>
            {sentAt ? null : (
              <Checkbox
                id={`hold-slots-${project.id}`}
                labelText="Hold these slots with the experts for 48 hours"
                checked={holdSlots}
                disabled={isPrepared}
                onChange={(_, { checked }) => setHoldSlots(checked)}
              />
            )}
            {error ? (
              <InlineNotification
                kind="error"
                lowContrast
                title="That didn’t send."
                subtitle={toUserMessage(error)}
                onClose={() => setError(null)}
              />
            ) : null}
            {isPrepared ? null : (
              <div className={styles.readyFoot}>
                {sentAt ? (
                  <Button
                    as={Link}
                    href={routes.admin.projectStep(project.id, 'client')}
                    renderIcon={ArrowRight}
                  >
                    View the client email
                  </Button>
                ) : (
                  <Button
                    renderIcon={ArrowRight}
                    className={styles.sendButton}
                    disabled={ready.length === 0 || action.isPending}
                    onClick={send}
                  >
                    {action.isPending
                      ? 'Preparing…'
                      : `Send ${ready.length === 1 ? 'this expert' : 'these experts'} to ${client}`}
                  </Button>
                )}
              </div>
            )}
          </article>

          {isPrepared ? (
            <>
              <p className={search.request}>
                Send {ready.length === 1 ? 'this expert' : 'these experts'} to {client}
              </p>
              <ChatClientEmail project={project} />
            </>
          ) : null}
        </div>
      </StreamedAnswer>
    </div>
  );
}
