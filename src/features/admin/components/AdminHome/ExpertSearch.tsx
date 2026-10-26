'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ActionableNotification,
  Button,
  Checkbox,
  InlineLoading,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import { CheckmarkFilled, CircleDash, MagicWand, SendAlt } from '@carbon/icons-react';
import { EmphasisText } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { CountryFlag } from '@/shared/ui';
import { useExpertSearch, useProject, useSendScreening } from '../../api/queries';
import { EXPERT_SOURCE_LABELS, type ExtendResearch } from '../../model/expertSearch.schema';
import { EXPERT_ORIGIN_LABELS, type MatchedExpert } from '../../model/match.schema';
import type { Project } from '../../model/project.schema';
import { ExtendResearchSteps } from './ExtendResearchSteps';
import { StreamedAnswer } from './StreamedAnswer';
import styles from './ExpertSearch.module.scss';

/** How long each step shows before its check mark, then the "almost there" note. */
const STEP_MS = 1600;
const NOTE_MS = 1200;
const FIRST_BATCH = 10;

type Round = {
  id: number;
  offset: number;
  criteria: ExtendResearch | null;
  /** Everyone shown before this round, so it only finds new people. */
  excludeIds: string[];
};
type RoundResult = { experts: MatchedExpert[]; remaining: number };

/**
 * Home chat: the AI finds experts for a project in the open. Two steps tick off, a short note
 * says the experts are on their way, then the top 10 arrive ranked. The PM picks several and
 * sends them the screening questions, or extends the research from a card in the thread; each
 * extension runs the same way and adds its experts below.
 */
export function ExpertSearch({
  projectId,
  onWorking,
  onAsk,
}: {
  projectId: string;
  /** Asks the assistant a follow-up, e.g. to show the screening answers in the chat. */
  onAsk?: (question: string) => void;
  /** Tells the answer's mascot whether the AI is still searching. */
  onWorking?: (working: boolean) => void;
}) {
  const project = useProject(projectId);
  const screening = useSendScreening(projectId);
  const [rounds, setRounds] = useState<Round[]>([
    { id: 1, offset: 0, criteria: null, excludeIds: [] },
  ]);
  const [results, setResults] = useState<Record<number, RoundResult>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);
  const [isExtending, setIsExtending] = useState(false);
  const extendButton = useRef<HTMLButtonElement>(null);
  const extendCard = useRef<HTMLElement>(null);

  // Opening Extend research scrolls the whole form into view above the docked ask bar (its
  // scroll margin), or its top under the header when it's taller than the space left.
  useEffect(() => {
    const card = extendCard.current;
    if (!isExtending || !card) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fits = card.offsetHeight < window.innerHeight * 0.7;
    card.scrollIntoView?.({ block: fits ? 'end' : 'start', behavior: still ? 'auto' : 'smooth' });
  }, [isExtending]);

  const last = rounds.at(-1);
  const lastDone = last ? results[last.id] !== undefined : false;
  const total = Object.values(results).reduce((sum, r) => sum + r.experts.length, 0);

  // The mascot works while a round is searching, and settles once its experts arrive.
  const reportWorking = useRef(onWorking);
  useEffect(() => {
    reportWorking.current = onWorking;
  });
  useEffect(() => {
    reportWorking.current?.(!lastDone);
  }, [lastDone]);
  useEffect(() => () => reportWorking.current?.(false), []);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((current) =>
      on ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)),
    );

  const send = async () => {
    setIsSending(true);
    setSendError(null);
    try {
      let latest = sent;
      for (const id of selected) {
        latest = (await screening.mutateAsync(id)).screeningSent;
      }
      setSent(latest);
      setSelected([]);
    } catch (error) {
      setSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  const extend = (criteria: ExtendResearch) => {
    setIsExtending(false);
    const shown = Object.values(results).flatMap((r) => r.experts.map((e) => e.id));
    setRounds((current) => [
      ...current,
      { id: current.length + 1, offset: total, criteria, excludeIds: shown },
    ]);
  };

  if (project.isPending) {
    return <SkeletonText paragraph lineCount={3} />;
  }
  if (!project.data) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The search couldn’t start."
        subtitle={toUserMessage(project.error)}
      />
    );
  }

  return (
    <div className={styles.search}>
      {rounds.map((round) => (
        <SearchRound
          key={round.id}
          project={project.data}
          round={round}
          selected={selected}
          sent={sent}
          onToggle={toggle}
          onDone={(result, screeningSent) => {
            setResults((current) => ({ ...current, [round.id]: result }));
            setSent(screeningSent);
          }}
        />
      ))}

      {lastDone ? (
        <div className={styles.actions}>
          {total > 0 ? (
            <Button
              size="md"
              renderIcon={SendAlt}
              disabled={selected.length === 0 || isSending}
              onClick={() => void send()}
            >
              {isSending
                ? 'Sending…'
                : selected.length > 0
                  ? `Send screening questions to ${selected.length}`
                  : 'Send screening questions'}
            </Button>
          ) : null}
          <Button
            ref={extendButton}
            kind={total > 0 ? 'tertiary' : 'primary'}
            size="md"
            renderIcon={MagicWand}
            disabled={isExtending}
            onClick={() => setIsExtending(true)}
          >
            Extend research with AI
          </Button>
        </div>
      ) : null}

      {sendError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Some questions didn’t send."
          subtitle={toUserMessage(sendError)}
          onCloseButtonClick={() => setSendError(null)}
        />
      ) : null}

      {sent.length > 0 && lastDone ? (
        <p className={styles.sentNote} role="status">
          <CheckmarkFilled aria-hidden={true} />
          <span>
            <EmphasisText
              text={`Screening questions sent to [[!${sent.length} ${sent.length === 1 ? 'expert' : 'experts'}]].`}
            />
          </span>
          {onAsk ? (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onAsk(`Show the screening answers for ${projectId}`)}
            >
              View screening answers ({sent.length})
            </Button>
          ) : (
            <Link href={routes.admin.projectStep(projectId, 'responses')}>
              View screening answers ({sent.length})
            </Link>
          )}
        </p>
      ) : null}

      {isExtending ? (
        <article ref={extendCard} className={styles.extendCard} aria-label="Extend research">
          <ExtendResearchSteps
            project={project.data}
            idPrefix={`chat-extend-${projectId}-${rounds.length}`}
            onCancel={() => {
              setIsExtending(false);
              extendButton.current?.focus();
            }}
            onSubmit={extend}
          />
        </article>
      ) : null}
    </div>
  );
}

/** The paragraph streams first; the table follows after this beat. */
const TABLE_PAUSE_MS = 500;

function sourcesText(criteria: ExtendResearch): string {
  return criteria.sources.map((source) => EXPERT_SOURCE_LABELS[source]).join(' and ');
}

/**
 * The ranked experts as a plain, readable table (like a ChatGPT answer): rank, name (linked to
 * LinkedIn), expertise, experience, source, the AI's best-fit reason and match. A checkbox per row
 * picks experts for screening questions; sent rows show a check instead.
 */
function ExpertTable({
  project,
  round,
  experts,
  open,
  allOn,
  selected,
  sent,
  onToggle,
}: {
  project: Project;
  round: Round;
  experts: MatchedExpert[];
  open: string[];
  allOn: boolean;
  selected: string[];
  sent: string[];
  onToggle: (ids: string[], on: boolean) => void;
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-label="Ranked experts">
        <thead>
          <tr>
            <th scope="col" className={styles.pickCol}>
              {open.length > 0 ? (
                <Checkbox
                  id={`select-all-${project.id}-${round.id}`}
                  labelText={allOn ? 'Clear all' : `Select all ${open.length}`}
                  hideLabel
                  checked={allOn}
                  onChange={(_, { checked }) => onToggle(open, checked)}
                />
              ) : null}
            </th>
            <th scope="col" className={styles.rankCol}>
              #
            </th>
            <th scope="col">Expert</th>
            <th scope="col">Expertise</th>
            <th scope="col">Best fit</th>
            <th scope="col" className={styles.matchCol}>
              Match
            </th>
          </tr>
        </thead>
        <tbody>
          {experts.map((expert, index) => {
            const isSent = sent.includes(expert.id);
            const name = expert.name ?? expert.label;
            const rank = round.offset + index + 1;
            return (
              <tr key={expert.id} style={{ '--i': index } as CSSProperties}>
                <td className={styles.pickCol}>
                  {isSent ? (
                    <span className={styles.sentMark} title="Screening questions sent">
                      <CheckmarkFilled aria-label={`Sent to ${name}`} />
                    </span>
                  ) : (
                    <Checkbox
                      id={`pick-${project.id}-${round.id}-${expert.id}`}
                      labelText={`Select ${name}, ${expert.role}, rank ${rank}, ${expert.matchPercent}% match`}
                      hideLabel
                      checked={selected.includes(expert.id)}
                      onChange={(_, { checked }) => onToggle([expert.id], checked)}
                    />
                  )}
                </td>
                <td className={styles.rankCol}>{rank}</td>
                {/* Who they are: name, then experience and country. */}
                <th scope="row" className={styles.expertCell}>
                  <span className={styles.expertName}>
                    {expert.linkedinUrl ? (
                      <a
                        className={styles.nameLink}
                        href={expert.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${name} on LinkedIn (opens in a new tab)`}
                      >
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                  </span>
                  <span className={styles.expertMeta}>
                    <strong className={styles.expertYears}>
                      {expert.years} {expert.years === 1 ? 'year' : 'years'}
                    </strong>
                    <span aria-hidden="true">·</span>
                    <CountryFlag code={expert.country} size="sm" />
                    {/* Only say where they came from when it isn't our own network. */}
                    {expert.source && expert.source !== 'network' ? (
                      <>
                        <span aria-hidden="true">·</span>
                        via {EXPERT_ORIGIN_LABELS[expert.source]}
                      </>
                    ) : null}
                  </span>
                </th>
                <td className={styles.expertiseCell}>{expert.role}</td>
                <td className={styles.fitCell}>{expert.whyPicked[0]}</td>
                <td className={styles.matchCol}>
                  <span className={styles.match}>
                    <span>{expert.matchPercent}%</span>
                    <span className={styles.matchTrack} aria-hidden="true">
                      <span
                        className={styles.matchFill}
                        style={{ inlineSize: `${expert.matchPercent}%` }}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function requestLine(criteria: ExtendResearch): string {
  const sources = criteria.sources.map((s) => EXPERT_SOURCE_LABELS[s]).join(' and ');
  return `Find ${criteria.minExperts}–${criteria.maxExperts} more experts with ${criteria.minYears}+ years, on ${sources}.`;
}

function SearchRound({
  project,
  round,
  selected,
  sent,
  onToggle,
  onDone,
}: {
  project: Project;
  round: Round;
  selected: string[];
  sent: string[];
  onToggle: (ids: string[], on: boolean) => void;
  onDone: (result: RoundResult, screeningSent: string[]) => void;
}) {
  const search = useExpertSearch(project.id);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);
  const reported = useRef(false);
  // The search's answer waits here until the steps have played, then goes to the parent.
  const pending = useRef<{ result: RoundResult; screeningSent: string[] } | null>(null);

  const steps = round.criteria
    ? [
        `Searching ${round.criteria.sources.map((s) => EXPERT_SOURCE_LABELS[s]).join(' and ')}`,
        'Picking the best new matches',
      ]
    : ['Finding experts across the network', 'Picking the top-ranked experts for this brief'];

  const run = () => {
    setError(null);
    search.mutate(
      {
        offset: round.offset,
        limit: round.criteria?.maxExperts ?? FIRST_BATCH,
        ...(round.criteria ? { criteria: round.criteria, excludeIds: round.excludeIds } : {}),
      },
      {
        onSuccess: (data) => {
          const next = { experts: data.experts, remaining: data.remaining };
          pending.current = { result: next, screeningSent: data.screeningSent };
          setResult(next);
        },
        onError: setError,
      },
    );
  };

  // Start the search once, as the first step begins.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per round
  }, []);

  // Tick the steps off; the last one waits for the search, then the note shows briefly.
  useEffect(() => {
    if (error) return;
    if (step < steps.length - 1) {
      const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    if (step === steps.length - 1 && result) {
      const timer = window.setTimeout(() => setStep(steps.length), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    if (step === steps.length) {
      const timer = window.setTimeout(() => setStep(steps.length + 1), NOTE_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, steps.length, result, error]);

  const isDone = step > steps.length && result !== null;
  const outcome = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isDone && pending.current && !reported.current) {
      reported.current = true;
      onDone(pending.current.result, pending.current.screeningSent);
      // Bring the experts into view as they arrive; the thread only follows new questions.
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      outcome.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
  }, [isDone, onDone]);

  const open = result ? result.experts.filter((e) => !sent.includes(e.id)).map((e) => e.id) : [];
  const allOn = open.length > 0 && open.every((id) => selected.includes(id));

  return (
    <section
      className={styles.round}
      aria-label={round.criteria ? 'Extended search' : `Finding experts for ${project.id}`}
    >
      {round.criteria ? <p className={styles.request}>{requestLine(round.criteria)}</p> : null}

      <ol className={styles.steps} aria-live="polite">
        {steps.map((label, index) => (
          <li key={label}>
            {index < step ? (
              <InlineLoading status="finished" description={label} />
            ) : index === step && !error ? (
              <InlineLoading status="active" description={`${label}…`} />
            ) : (
              <span className={styles.stepPending}>
                <CircleDash aria-hidden={true} />
                {label}
              </span>
            )}
          </li>
        ))}
        {step === steps.length && !error ? (
          <li>
            <InlineLoading
              status="active"
              description="Almost there. Your experts will be here in a few moments…"
            />
          </li>
        ) : null}
      </ol>

      {error ? (
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          hasFocus={false}
          title="The search stopped."
          subtitle={toUserMessage(error)}
          actionButtonLabel="Try again"
          onActionButtonClick={run}
        />
      ) : null}

      <div ref={outcome} className={styles.outcome}>
        {isDone && result ? (
          result.experts.length === 0 ? (
            <p className={styles.summary}>
              <strong>No one in the current pool matches yet.</strong> Extend the research to look
              further, for example on LinkedIn.
            </p>
          ) : (
            <div className={styles.result}>
              <h4 className={styles.resultTitle}>
                {round.criteria
                  ? `${result.experts.length} more ${result.experts.length === 1 ? 'expert' : 'experts'} for ${project.name}`
                  : `Top ${result.experts.length} experts for ${project.name}`}
              </h4>
              <StreamedAnswer
                className={styles.resultIntro}
                pauseMs={TABLE_PAUSE_MS}
                text={
                  round.criteria
                    ? `These are **${result.experts.length} more experts** found on ${sourcesText(round.criteria)}, ranked by how well they fit the brief. Names link to LinkedIn where they have a profile.`
                    : `The list ranks the **top ${result.experts.length} of ${round.offset + result.experts.length + result.remaining} matches** by how well they fit the brief and your screening questions. Names link to LinkedIn where they have a profile; the best fit is the AI’s reading of their background, not a verified claim.`
                }
              >
                <ExpertTable
                  project={project}
                  round={round}
                  experts={result.experts}
                  open={open}
                  allOn={allOn}
                  selected={selected}
                  sent={sent}
                  onToggle={onToggle}
                />
              </StreamedAnswer>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
