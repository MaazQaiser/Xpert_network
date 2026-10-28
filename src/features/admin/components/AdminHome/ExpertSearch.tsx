'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ActionableNotification,
  Button,
  Checkbox,
  InlineLoading,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import { ArrowUpRight, CheckmarkFilled, CircleDash, LogoLinkedin } from '@carbon/icons-react';
import { EmphasisText } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { CountryFlag } from '@/shared/ui';
import { useExpertSearch, useProject, useResponses, useSendScreening } from '../../api/queries';
import { EXPERT_SOURCE_LABELS, type ExtendResearch } from '../../model/expertSearch.schema';
import type { MatchedExpert } from '../../model/match.schema';
import type { Project } from '../../model/project.schema';
import { FlowToast } from './AnswerToast';
import { ExpertAvatar, ExpertProfilePanel } from './ExpertProfilePanel';
import { ExtendResearchSteps } from './ExtendResearchSteps';
import styles from './ExpertSearch.module.scss';

/** How long each step shows before its check mark, then the "almost there" note. */
const STEP_MS = 1600;
const NOTE_MS = 1200;
const FIRST_BATCH = 10;
/** How long after the questions go out the first answer arrives, in the prototype. */
const ANSWER_TOAST_MS = 5000;

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
 * sends them the screening questions, or extends the research from a card in the thread. An
 * extension stays in this chat as a search in progress: it does not list the new experts here.
 */
type Notice = { key: string; label: string; title: string; action: string; onAction: () => void };

export function ExpertSearch({
  projectId,
  onWorking,
  onAsk,
  onHome,
}: {
  projectId: string;
  /** Asks the assistant a follow-up, e.g. to show the screening answers in the chat. */
  onAsk?: (question: string) => void;
  /** Tells the answer's mascot whether the AI is still searching. */
  onWorking?: (working: boolean) => void;
  /** Clears the chat and returns to the home summary. */
  onHome?: () => void;
}) {
  const project = useProject(projectId);
  const screening = useSendScreening(projectId);
  const [rounds, setRounds] = useState<Round[]>([
    { id: 1, offset: 0, criteria: null, excludeIds: [] },
  ]);
  const [results, setResults] = useState<Record<number, RoundResult>>({});
  const [selected, setSelected] = useState<string[]>([]);
  // The expert whose profile is open in the side panel.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);
  const [isExtending, setIsExtending] = useState(false);
  // The latest finished step: questions sent, then the first answer.
  const [notice, setNotice] = useState<Notice | null>(null);
  const responses = useResponses(projectId, { enabled: false });
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
    const batch = selected;
    try {
      let latest = sent;
      for (const id of batch) {
        latest = (await screening.mutateAsync(id)).screeningSent;
      }
      setSent(latest);
      setSelected([]);
      const count = batch.length;
      setNotice({
        key: 'sent',
        label: 'Questions sent',
        title: `Questions sent to ${count} ${count === 1 ? 'expert' : 'experts'}`,
        action: 'Review other items',
        onAction: () => onHome?.(),
      });
      announceFirstAnswer(batch);
    } catch (error) {
      setSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  // A few seconds on, check who has answered from this batch and say so in a toast.
  const announceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(announceTimer.current), []);
  const announceFirstAnswer = (batch: string[]) => {
    window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => {
      void responses.refetch().then(({ data }) => {
        const first = data?.responses.find(
          (r) => batch.includes(r.expertId) && r.status === 'answered',
        );
        if (!first) return;
        const name = first.name ?? first.label;
        setNotice({
          key: first.expertId,
          label: `${name} answered`,
          title: `${name} answered the screening questions`,
          action: 'Review answers',
          onAction: () => {
            setNotice(null);
            onAsk?.(`Show me ${name}’s screening answers`);
          },
        });
      });
    }, ANSWER_TOAST_MS);
  };

  const extend = (criteria: ExtendResearch) => {
    setIsExtending(false);
    const shown = Object.values(results).flatMap((r) => r.experts.map((e) => e.id));
    setRounds((current) => [
      ...current,
      { id: current.length + 1, offset: total, criteria, excludeIds: shown },
    ]);
    setNotice({
      key: 'finding',
      label: 'Finding more experts',
      title: 'I’m finding more experts',
      action: 'Review other tasks',
      onAction: () => onHome?.(),
    });
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

  // Everyone found so far, in the order shown, so the panel can step through them.
  const everyone = rounds.flatMap((round) => results[round.id]?.experts ?? []);
  const viewing = everyone.find((e) => e.id === viewingId) ?? null;

  return (
    <div className={styles.search}>
      {viewing ? (
        <ExpertProfilePanel
          key={viewing.id}
          project={project.data}
          expert={viewing}
          rank={everyone.indexOf(viewing) + 1}
          total={everyone.length}
          isSent={sent.includes(viewing.id)}
          isSelected={selected.includes(viewing.id)}
          onToggle={(on) => toggle([viewing.id], on)}
          onStep={(step) => setViewingId(everyone[everyone.indexOf(viewing) + step]?.id ?? null)}
          onClose={() => setViewingId(null)}
        />
      ) : null}
      {rounds.map((round) => (
        <SearchRound
          key={round.id}
          project={project.data}
          round={round}
          selected={selected}
          sent={sent}
          onToggle={toggle}
          viewingId={viewingId}
          onView={setViewingId}
          onHome={onHome}
          onDone={(result, screeningSent) => {
            setResults((current) => ({ ...current, [round.id]: result }));
            setSent(screeningSent);
            // The "still looking" note makes way for the experts it found.
            setNotice((current) => (current?.key === 'finding' ? null : current));
          }}
        />
      ))}

      {lastDone ? (
        <div className={styles.actions}>
          {total > 0 ? (
            <Button
              size="md"
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
        <div className={styles.sentBlock}>
          <p className={styles.sentNote} role="status">
            <CheckmarkFilled aria-hidden={true} />
            <span>
              <EmphasisText
                text={`Questions sent to [[!${sent.length} ${sent.length === 1 ? 'expert' : 'experts'}]] on **${project.data.name}**. I’m getting their answers.`}
              />
            </span>
          </p>
          {onHome ? (
            <div className={styles.actions}>
              <Button kind="tertiary" size="md" onClick={onHome}>
                Review other items
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <FlowToast
          key={notice.key}
          label={notice.label}
          title={notice.title}
          action={notice.action}
          onAction={notice.onAction}
          onClose={() => setNotice(null)}
        />
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

/**
 * Ranked experts in small columns: photo, name, years, where they are based, LinkedIn and
 * profile match. A checkbox picks experts for screening questions; sent rows show a check.
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
  viewingId,
  onView,
}: {
  project: Project;
  round: Round;
  experts: MatchedExpert[];
  open: string[];
  allOn: boolean;
  selected: string[];
  sent: string[];
  onToggle: (ids: string[], on: boolean) => void;
  /** The expert open in the side panel; a row opens theirs. */
  viewingId: string | null;
  onView: (id: string) => void;
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={`${styles.table} ${styles.tableCompact}`} aria-label="Ranked experts">
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
            <th scope="col" className={styles.photoCol}>
              <span className="cds--visually-hidden">Photo</span>
            </th>
            <th scope="col">Name</th>
            <th scope="col" className={styles.tightCol}>
              Year of exp
            </th>
            <th scope="col" className={styles.tightCol}>
              Based in
            </th>
            <th scope="col" className={`${styles.tightCol} ${styles.linkedinCol}`}>
              LinkedIn profile
            </th>
            <th scope="col" className={`${styles.tightCol} ${styles.matchCol}`}>
              Profile match
            </th>
            <th scope="col" className={styles.viewCol}>
              <span className="cds--visually-hidden">View profile</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {experts.map((expert, index) => {
            const isSent = sent.includes(expert.id);
            const name = expert.name ?? expert.label;
            const rank = round.offset + index + 1;
            return (
              <tr
                key={expert.id}
                className={expert.id === viewingId ? `${styles.row} ${styles.rowOpen}` : styles.row}
                style={{ '--i': index } as CSSProperties}
                onClick={() => onView(expert.id)}
              >
                {/* Ticking the box picks them; it doesn't open the panel. */}
                <td className={styles.pickCol} onClick={(event) => event.stopPropagation()}>
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
                <td className={styles.photoCol}>
                  <ExpertAvatar name={name} photoUrl={expert.photoUrl} size="sm" />
                </td>
                <th scope="row" className={styles.nameCell}>
                  {name}
                </th>
                <td className={styles.tightCol}>
                  {expert.years} {expert.years === 1 ? 'yr' : 'yrs'}
                </td>
                <td className={styles.tightCol}>
                  <CountryFlag code={expert.country} size="sm" short />
                </td>
                <td className={`${styles.tightCol} ${styles.linkedinCol}`}>
                  {expert.linkedinUrl ? (
                    <a
                      className={`${styles.source} ${styles.sourceLinkedin} ${styles.sourceLink}`}
                      href={expert.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${name} on LinkedIn (opens in a new tab)`}
                      title="LinkedIn profile"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LogoLinkedin size={16} aria-hidden={true} />
                    </a>
                  ) : (
                    <span className={styles.none}>None</span>
                  )}
                </td>
                <td className={`${styles.tightCol} ${styles.matchCol}`}>{expert.matchPercent}%</td>
                <td className={styles.viewCol} onClick={(event) => event.stopPropagation()}>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={ArrowUpRight}
                    iconDescription={`Open ${name}’s profile`}
                    tooltipPosition="left"
                    tooltipAlignment="center"
                    aria-haspopup="dialog"
                    onClick={() => onView(expert.id)}
                  />
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
  viewingId,
  onView,
  onHome,
  onDone,
}: {
  project: Project;
  round: Round;
  selected: string[];
  sent: string[];
  onToggle: (ids: string[], on: boolean) => void;
  viewingId: string | null;
  onView: (id: string) => void;
  /** Clears the chat and returns to the home summary. */
  onHome?: () => void;
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
    : [
        'Matching the brief against expert profiles',
        'Picking the top-ranked experts for this brief',
      ];

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
    // An extended search stays open in this chat. It never flips over to a results table.
    if (step === steps.length && !round.criteria) {
      const timer = window.setTimeout(() => setStep(steps.length + 1), NOTE_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, steps.length, result, error, round.criteria]);

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

      {/* The steps make way for the experts once they're in. */}
      {isDone ? null : (
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
                description={
                  round.criteria
                    ? 'Finding more experts…'
                    : 'Almost there. Your experts will be here in a few moments…'
                }
              />
            </li>
          ) : null}
        </ol>
      )}

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
        {round.criteria ? (
          <div className={styles.sentBlock}>
            <p className={styles.sentNote} role="status">
              I’m finding more experts. Review other tasks while I look.
            </p>
            {onHome ? (
              <Button kind="tertiary" size="md" onClick={onHome}>
                Review other tasks
              </Button>
            ) : null}
          </div>
        ) : null}
        {isDone && result && !round.criteria ? (
          result.experts.length === 0 ? (
            <p className={styles.summary}>
              <strong>No one in the current pool matches yet.</strong> Extend the research to look
              further, for example on LinkedIn.
            </p>
          ) : (
            <div className={styles.result}>
              <h4 className={styles.resultTitle}>
                {`These are the top ${result.experts.length} experts for ${project.name}`}
              </h4>
              <ExpertTable
                project={project}
                round={round}
                experts={result.experts}
                open={open}
                allOn={allOn}
                selected={selected}
                sent={sent}
                onToggle={onToggle}
                viewingId={viewingId}
                onView={onView}
              />
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
