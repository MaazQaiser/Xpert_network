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
import { ArrowRight, CircleDash } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { formatTime } from '@/shared/lib/dates';
import { CountryFlag } from '@/shared/ui';
import { useProject, useResponses } from '../../api/queries';
import { EXPERT_ORIGIN_LABELS } from '../../model/match.schema';
import type { Project } from '../../model/project.schema';
import {
  ANSWER_QUALITY_LABELS,
  type ExpertResponse,
  type ResponsesResult,
} from '../../model/responses.schema';
import { ChatAvailability } from './ChatAvailability';
import { StreamedAnswer } from './StreamedAnswer';
import search from './ExpertSearch.module.scss';
import styles from './ScreeningAnswers.module.scss';

/** How long each step shows before its check mark. */
const STEP_MS = 1600;
/** The paragraph streams first; the table follows after this beat. */
const TABLE_PAUSE_MS = 500;
/** A report opens on its first answers; Read all shows the rest. */
const PREVIEW_ANSWERS = 4;

const STEPS = ['Finding which experts answered the screening questions', 'Reading their answers'];

const nameOf = (response: ExpertResponse) => response.name ?? response.label;

/**
 * Home chat: the PM asks to see the screening answers. The AI looks in the open (who answered,
 * then reading what they wrote), then lists the experts who answered with how well. Opening an
 * expert shows their report in the thread; the PM picks who to move forward and confirms their
 * availability on the next screen.
 */
export function ScreeningAnswers({
  projectId,
  onWorking,
}: {
  projectId: string;
  /** Tells the answer's mascot whether the AI is still looking. */
  onWorking?: (working: boolean) => void;
}) {
  const project = useProject(projectId);
  const responses = useResponses(projectId);
  const [step, setStep] = useState(0);
  const outcome = useRef<HTMLDivElement>(null);

  // Tick the steps off; the last one waits for the answers to arrive.
  useEffect(() => {
    if (responses.isError) return;
    if (step < STEPS.length - 1 || (step === STEPS.length - 1 && responses.data)) {
      const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, responses.data, responses.isError]);

  const isDone = step >= STEPS.length && responses.data !== undefined;

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
      <ol className={search.steps} aria-live="polite">
        {STEPS.map((label, index) => (
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
        {isDone ? <ScreeningReview project={project.data} data={responses.data} /> : null}
      </div>
    </section>
  );
}

function ScreeningReview({ project, data }: { project: Project; data: ResponsesResult }) {
  const answered = data.responses.filter((r) => r.status === 'answered');
  const waiting = data.responses.filter(
    (r) => r.status === 'in_progress' || r.status === 'not_opened',
  ).length;
  const picks = answered.filter((r) => r.aiPick).map((r) => r.expertId);
  const [selected, setSelected] = useState<string[]>(picks);
  const [openId, setOpenId] = useState<string | null>(null);
  // Who the PM confirmed to move forward; their times then load below, in the thread.
  const [confirmed, setConfirmed] = useState<string[] | null>(null);
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
      ? `I’ve selected the [[!${picks.length} with the strongest answers]] to move forward. Open any expert to read their report.`
      : 'Open any expert to read their report, then pick who to move forward.',
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
            isLocked={confirmed !== null}
            onToggle={toggle}
            onOpen={setOpenId}
          />

          {open ? (
            <ExpertReport key={open.expertId} response={open} questionCount={data.questionCount} />
          ) : null}

          {confirmed ? null : (
            <div className={styles.confirm}>
              <p className={styles.confirmNote} aria-live="polite">
                <strong>{selected.length}</strong> of {answered.length} selected to move forward
              </p>
              <Button
                size="md"
                renderIcon={ArrowRight}
                disabled={selected.length === 0}
                onClick={() => setConfirmed(selected)}
              >
                Confirm availability for {selected.length}
              </Button>
            </div>
          )}

          {confirmed ? (
            <>
              <p className={search.request}>
                Confirm availability for {confirmed.length}{' '}
                {confirmed.length === 1 ? 'expert' : 'experts'}
              </p>
              <ChatAvailability project={project} expertIds={confirmed} people={answered} />
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
                  <span className={search.expertMeta}>
                    {response.years !== undefined ? (
                      <strong className={search.expertYears}>
                        {response.years} {response.years === 1 ? 'year' : 'years'}
                      </strong>
                    ) : null}
                    {response.country ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <CountryFlag code={response.country} size="sm" />
                      </>
                    ) : null}
                    {response.source && response.source !== 'network' ? (
                      <>
                        <span aria-hidden="true">·</span>
                        via {EXPERT_ORIGIN_LABELS[response.source]}
                      </>
                    ) : null}
                  </span>
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
 * One expert's report in the thread, written like the AI handing it over: who they are, the AI's
 * one-line read, then their answers question by question. Read all shows every answer.
 */
function ExpertReport({
  response,
  questionCount,
}: {
  response: ExpertResponse;
  questionCount: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const report = useRef<HTMLElement>(null);
  const name = nameOf(response);
  const given = response.answers.filter((a) => a.answer !== null);
  const shown = showAll ? given : given.slice(0, PREVIEW_ANSWERS);

  // Opening a report brings it into view under the table.
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    report.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, []);

  const meta = [
    response.role,
    response.years !== undefined ? `${response.years} years` : null,
    response.submittedAt ? `submitted ${formatTime(response.submittedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      ref={report}
      id={`report-${response.expertId}`}
      className={styles.report}
      aria-label={`${name}’s report`}
    >
      <StreamedAnswer
        className={styles.reportIntro}
        text={`Here’s **${name}**’s report. Their answers to the ${questionCount} screening questions are given below.`}
      >
        <div className={styles.reportBody}>
          <header className={styles.reportHead}>
            <div>
              <h5 className={styles.reportName}>{name}</h5>
              <p className={styles.reportMeta}>{meta}</p>
            </div>
            {response.quality ? (
              <span className={styles.reportTag}>
                <Tag type="gray" size="sm">
                  {ANSWER_QUALITY_LABELS[response.quality]} answers
                </Tag>
              </span>
            ) : null}
          </header>

          {response.summary ? (
            <div className={styles.summary}>
              <p className={styles.summaryLabel}>AI summary</p>
              <p>{response.summary}</p>
            </div>
          ) : null}

          <ol className={styles.answers} aria-label={`${name}’s answers`}>
            {shown.map((answer) => {
              const index = response.answers.indexOf(answer);
              return (
                <li key={answer.questionId} className={styles.answer}>
                  <p className={styles.question}>
                    Q{index + 1} · {answer.question}
                  </p>
                  <p>{answer.answer}</p>
                </li>
              );
            })}
          </ol>

          {given.length > PREVIEW_ANSWERS ? (
            <div className={styles.reportFoot}>
              <Button kind="tertiary" size="md" onClick={() => setShowAll((all) => !all)}>
                {showAll ? 'Show fewer answers' : `Read all ${given.length} answers`}
              </Button>
            </div>
          ) : null}
        </div>
      </StreamedAnswer>
    </article>
  );
}
