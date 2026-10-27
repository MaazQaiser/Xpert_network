'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ActionableNotification,
  Button,
  Checkbox,
  InlineLoading,
  InlineNotification,
  SkeletonText,
  Tag,
} from '@carbon/react';
import { ArrowRight, CircleDash, SendAlt } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { CountryFlag } from '@/shared/ui';
import {
  useAvailability,
  useAvailabilityAction,
  useProject,
  useResponses,
} from '../../api/queries';
import type { Availability } from '../../model/availability.schema';
import type { Project } from '../../model/project.schema';
import {
  ANSWER_QUALITY_LABELS,
  type ExpertResponse,
  type ResponsesResult,
} from '../../model/responses.schema';
import { ChatClientEmail } from './ChatClientEmail';
import { ReportPanel } from './ReportPanel';
import { StreamedAnswer } from './StreamedAnswer';
import chat from './ChatBlocks.module.scss';
import search from './ExpertSearch.module.scss';
import styles from './ScreeningAnswers.module.scss';

/** How long each step shows before its check mark. */
const STEP_MS = 1600;
/** The paragraph streams first; the table follows after this beat. */
const TABLE_PAUSE_MS = 500;

const STEPS = [
  'Finding which experts answered the screening questions',
  'Reading their answers and free times',
];

const nameOf = (response: ExpertResponse) => response.name ?? response.label;

/**
 * Home chat: the PM asks to see the screening answers. The AI looks in the open (who answered,
 * then reading what they wrote), then lists the experts who answered with how well. Opening an
 * expert shows their report in the thread; the PM picks who to move forward and confirms their
 * availability on the next screen.
 */
export function ScreeningAnswers({
  projectId,
  expertId,
  expertName,
  onWorking,
}: {
  projectId: string;
  /** Asked for one expert: their report opens as soon as the answers are in. */
  expertId?: string;
  expertName?: string;
  /** Tells the answer's mascot whether the AI is still looking. */
  onWorking?: (working: boolean) => void;
}) {
  const project = useProject(projectId);
  const responses = useResponses(projectId);
  const [step, setStep] = useState(0);
  const outcome = useRef<HTMLDivElement>(null);
  const steps = expertName
    ? [`Finding ${expertName}’s screening answers`, 'Reading their answers and free times']
    : STEPS;

  // Tick the steps off; the last one waits for the answers to arrive.
  useEffect(() => {
    if (responses.isError) return;
    if (step < steps.length - 1 || (step === steps.length - 1 && responses.data)) {
      const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, steps.length, responses.data, responses.isError]);

  const isDone = step >= steps.length && responses.data !== undefined;

  // The mascot works while the AI is looking, and settles once the answers are in.
  const reportWorking = useRef(onWorking);
  useEffect(() => {
    reportWorking.current = onWorking;
  });
  useEffect(() => {
    reportWorking.current?.(!isDone && !responses.isError);
  }, [isDone, responses.isError]);
  useEffect(() => () => reportWorking.current?.(false), []);

  // Bring the answers into view as they arrive.
  useEffect(() => {
    if (!isDone) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    outcome.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [isDone]);

  if (project.isPending) return <SkeletonText paragraph lineCount={3} />;
  if (!project.data) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The screening answers couldn’t load."
        subtitle={toUserMessage(project.error)}
      />
    );
  }

  return (
    <section className={search.round} aria-label={`Screening answers for ${project.data.id}`}>
      {/* The steps make way for the answer once it's in. */}
      {isDone ? null : (
        <ol className={search.steps} aria-live="polite">
          {steps.map((label, index) => (
            <li key={label}>
              {index < step ? (
                <InlineLoading status="finished" description={label} />
              ) : index === step && !responses.isError ? (
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
      )}

      {responses.isError ? (
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          hasFocus={false}
          title="The screening answers didn’t load."
          subtitle={toUserMessage(responses.error)}
          actionButtonLabel="Try again"
          onActionButtonClick={() => void responses.refetch()}
        />
      ) : null}

      <div ref={outcome} className={search.outcome}>
        {isDone ? (
          <ScreeningReview project={project.data} data={responses.data} expertId={expertId} />
        ) : null}
      </div>
    </section>
  );
}

function ScreeningReview({
  project,
  data,
  expertId,
}: {
  project: Project;
  data: ResponsesResult;
  expertId?: string;
}) {
  const answered = data.responses.filter((r) => r.status === 'answered');
  const waiting = data.responses.filter(
    (r) => r.status === 'in_progress' || r.status === 'not_opened',
  ).length;
  const picks = answered.filter((r) => r.aiPick).map((r) => r.expertId);
  const [selected, setSelected] = useState<string[]>(picks);
  const [openId, setOpenId] = useState<string | null>(expertId ?? null);
  // Every expert who answered also gave their free times; the PM sends the picks to the client.
  const availability = useAvailability(
    project.id,
    answered.map((r) => r.expertId),
  );
  const [isPrepared, setIsPrepared] = useState(false);
  const open = answered.find((r) => r.expertId === openId) ?? null;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => (on ? [...current, id] : current.filter((x) => x !== id)));

  if (data.responses.length === 0) {
    return (
      <p className={search.summary}>
        <strong>No screening questions have gone out yet.</strong> Pick experts above and send them
        the questions; their answers will show here.
      </p>
    );
  }
  if (answered.length === 0) {
    return (
      <p className={search.summary}>
        <strong>No one has answered yet.</strong> {waiting}{' '}
        {waiting === 1 ? 'expert is' : 'experts are'} still working on the screening questions.
      </p>
    );
  }

  const intro = [
    `**${answered.length} of ${data.responses.length} experts** answered the ${data.questionCount} screening questions`,
    waiting > 0 ? `, and ${waiting} ${waiting === 1 ? 'is' : 'are'} still answering. ` : '. ',
    picks.length > 0
      ? `I’ve selected the [[!${picks.length} with the strongest answers]] to move forward. Open any expert to read their answers and free times.`
      : 'Open any expert to read their answers and free times, then pick who to move forward.',
  ].join('');

  return (
    <div className={search.result}>
      <h4 className={search.resultTitle}>Screening answers for {project.name}</h4>
      <StreamedAnswer className={search.resultIntro} pauseMs={TABLE_PAUSE_MS} text={intro}>
        <div className={styles.review}>
          <AnswerTable
            project={project}
            data={data}
            answered={answered}
            selected={selected}
            openId={openId}
            isLocked={isPrepared}
            onToggle={toggle}
            onOpen={setOpenId}
          />

          {open ? (
            <ReportPanel
              key={open.expertId}
              response={open}
              questionCount={data.questionCount}
              times={availability.data}
              position={answered.indexOf(open)}
              total={answered.length}
              onStep={(step) =>
                setOpenId(answered[answered.indexOf(open) + step]?.expertId ?? null)
              }
              onClose={() => setOpenId(null)}
            />
          ) : null}

          {availability.data ? (
            <ReadyForClient
              project={project}
              data={availability.data}
              people={answered}
              selected={selected}
              isPrepared={isPrepared}
              onPrepared={() => setIsPrepared(true)}
            />
          ) : availability.isError ? (
            <ActionableNotification
              inline
              kind="error"
              lowContrast
              hideCloseButton
              hasFocus={false}
              title="Their free times didn’t load."
              subtitle={toUserMessage(availability.error)}
              actionButtonLabel="Try again"
              onActionButtonClick={() => void availability.refetch()}
            />
          ) : (
            <SkeletonText paragraph lineCount={2} />
          )}

          {isPrepared ? (
            <>
              <p className={search.request}>
                Send {selected.length === 1 ? 'this expert' : 'these experts'} to{' '}
                {availability.data?.clientName}
              </p>
              <ChatClientEmail project={project} />
            </>
          ) : null}
        </div>
      </StreamedAnswer>
    </div>
  );
}

/**
 * The experts who answered, like the ranked experts table: who they are, what they do, how far
 * they got and how good their answers are. A row opens that expert's report below.
 */
function AnswerTable({
  project,
  data,
  answered,
  selected,
  openId,
  isLocked,
  onToggle,
  onOpen,
}: {
  project: Project;
  data: ResponsesResult;
  answered: ExpertResponse[];
  selected: string[];
  openId: string | null;
  /** Once availability is confirmed, the picks are fixed. */
  isLocked: boolean;
  onToggle: (id: string, on: boolean) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className={search.tableScroll}>
      <table className={`${search.table} ${styles.table}`} aria-label="Experts who answered">
        <thead>
          <tr>
            <th scope="col" className={search.pickCol}>
              <span className="cds--visually-hidden">Move forward</span>
            </th>
            <th scope="col">Expert</th>
            <th scope="col">Expertise</th>
            <th scope="col">Answered</th>
            <th scope="col" className={styles.qualityCol}>
              Answer quality
            </th>
          </tr>
        </thead>
        <tbody>
          {answered.map((response, index) => {
            const name = nameOf(response);
            const isOpen = response.expertId === openId;
            return (
              <tr
                key={response.expertId}
                className={isOpen ? `${styles.row} ${styles.rowOpen}` : styles.row}
                style={{ '--i': index } as CSSProperties}
                onClick={() => onOpen(response.expertId)}
              >
                {/* Ticking the box picks them; it doesn't open the report. */}
                <td className={search.pickCol} onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    id={`answers-${project.id}-${response.expertId}`}
                    labelText={`Move ${name} forward`}
                    hideLabel
                    checked={selected.includes(response.expertId)}
                    disabled={isLocked}
                    onChange={(_, { checked }) => onToggle(response.expertId, checked)}
                  />
                </td>
                <th scope="row" className={search.expertCell}>
                  <button
                    type="button"
                    className={styles.nameButton}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? `report-${response.expertId}` : undefined}
                    aria-label={`Read ${name}’s report`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(response.expertId);
                    }}
                  >
                    {name}
                  </button>
                  {/* Who they are at a glance: the name, then the country. */}
                  {response.country ? (
                    <span className={search.expertMeta}>
                      <CountryFlag code={response.country} size="sm" short />
                    </span>
                  ) : null}
                </th>
                <td className={search.expertiseCell}>{response.role}</td>
                <td className={styles.count}>
                  {response.answeredCount} / {data.questionCount}
                </td>
                <td className={styles.qualityCol}>
                  {response.quality && response.qualityScore !== null ? (
                    <span className={search.match}>
                      <span>{ANSWER_QUALITY_LABELS[response.quality]}</span>
                      <span
                        className={search.matchTrack}
                        role="meter"
                        aria-label={`Answer quality for ${name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={response.qualityScore}
                      >
                        <span
                          className={search.matchFill}
                          style={{ inlineSize: `${response.qualityScore}%` }}
                        />
                      </span>
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Under the answers: the experts picked, with their times, are ready to go to the client. One
 * hold option and the one step to take; sending drafts the client email below, in the thread.
 */
function ReadyForClient({
  project,
  data,
  people,
  selected,
  isPrepared,
  onPrepared,
}: {
  project: Project;
  data: Availability;
  /** The experts who answered, for their names. */
  people: ExpertResponse[];
  selected: string[];
  isPrepared: boolean;
  onPrepared: () => void;
}) {
  const action = useAvailabilityAction(project.id);
  const [holdSlots, setHoldSlots] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const client = data.clientName;
  const ready = data.experts.filter(
    (e) => selected.includes(e.expertId) && e.status === 'confirmed' && e.slots.length > 0,
  );

  const send = () => {
    setError(null);
    action.mutate(
      {
        action: 'prepare_client',
        holdSlots,
        experts: ready.map((e) => ({ expertId: e.expertId, slotIds: e.slots.map((s) => s.id) })),
      },
      { onSuccess: onPrepared, onError: setError },
    );
  };

  return (
    <article className={chat.canvas} aria-labelledby={`ready-${project.id}`}>
      {/* A document card, like the brief: the bar says what it is, the page says what's next. */}
      <header className={chat.canvasBar}>
        <span className={chat.canvasLabel}>
          <SendAlt aria-hidden={true} />
          Ready for the client · {client}
        </span>
        <AIExplainLabel size="xs" aria-label={`${project.id} hand-off to the client`} />
      </header>

      <div className={chat.canvasPage}>
        <div className={chat.docHead}>
          <Tag type="blue" size="sm">
            {ready.length} {ready.length === 1 ? 'expert' : 'experts'} ready
          </Tag>
          <h3 id={`ready-${project.id}`} className={chat.docTitle}>
            Ready for the client
          </h3>
          <p className={chat.docMeta} aria-live="polite">
            {ready.length > 0 ? (
              <>
                <strong>
                  {ready.length} {ready.length === 1 ? 'expert has' : 'experts have'}
                </strong>{' '}
                times to offer. Next, send them to {client} with their answers and free slots.
              </>
            ) : (
              'Pick at least one expert above to send to the client.'
            )}
          </p>
        </div>

        {ready.length > 0 ? (
          <section className={chat.docSection}>
            <h4 className={chat.docHeading}>Going to {client.split(' ')[0]}</h4>
            <ul className={chat.docList}>
              {ready.map((e) => (
                <li key={e.expertId}>
                  {people.find((p) => p.expertId === e.expertId)?.name ?? e.label} ·{' '}
                  {e.slots.length} free {e.slots.length === 1 ? 'time' : 'times'}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Checkbox
          id={`hold-slots-${project.id}`}
          labelText="Hold these slots with the experts for 48 hours"
          checked={holdSlots}
          disabled={isPrepared}
          onChange={(_, { checked }) => setHoldSlots(checked)}
        />
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
          </div>
        )}
      </div>
    </article>
  );
}
