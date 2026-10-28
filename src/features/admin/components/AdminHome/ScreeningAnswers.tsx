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
import { ArrowUpRight, CircleDash, Email, LogoLinkedin, Phone } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import {
  useAvailability,
  useAvailabilityAction,
  useProject,
  useResponses,
} from '../../api/queries';
import type { Availability } from '../../model/availability.schema';
import type { Project } from '../../model/project.schema';
import {
  CONVERSATION_CHANNEL_LABELS,
  conversationChannelFor,
  type ConversationChannel,
  type ExpertResponse,
  type ResponsesResult,
} from '../../model/responses.schema';
import { ExpertAvatar } from './ExpertProfilePanel';
import { ReportPanel } from './ReportPanel';
import { StreamedAnswer } from './StreamedAnswer';
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
  onAsk,
}: {
  projectId: string;
  /** Asked for one expert: their report opens as soon as the answers are in. */
  expertId?: string;
  expertName?: string;
  /** Tells the answer's mascot whether the AI is still looking. */
  onWorking?: (working: boolean) => void;
  /** Asks the assistant to draft the client email for the selected experts. */
  onAsk?: (question: string) => void;
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
          <ScreeningReview
            project={project.data}
            data={responses.data}
            expertId={expertId}
            onAsk={onAsk}
          />
        ) : null}
      </div>
    </section>
  );
}

function ScreeningReview({
  project,
  data,
  expertId,
  onAsk,
}: {
  project: Project;
  data: ResponsesResult;
  expertId?: string;
  onAsk?: (question: string) => void;
}) {
  const answered = data.responses.filter((r) => r.status === 'answered');
  const waiting = data.responses.filter(
    (r) => r.status === 'in_progress' || r.status === 'not_opened',
  ).length;
  const picks = answered.filter((r) => r.aiPick).map((r) => r.expertId);
  const [selected, setSelected] = useState<string[]>(picks);
  const [openId, setOpenId] = useState<string | null>(expertId ?? null);
  const [shareError, setShareError] = useState<unknown>(null);
  const prepare = useAvailabilityAction(project.id);
  // Free times for the open report and the slots column. Sending to the client is a later step.
  const availability = useAvailability(
    project.id,
    answered.map((r) => r.expertId),
  );
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
            times={availability.data}
            selected={selected}
            openId={openId}
            isLocked={false}
            onToggle={toggle}
            onOpen={setOpenId}
          />

          {selected.length > 0 && onAsk ? (
            <ShareProfiles
              project={project}
              selected={selected}
              times={availability.data}
              isBusy={prepare.isPending}
              error={shareError}
              onDismiss={() => setShareError(null)}
              onDraft={async (experts) => {
                setShareError(null);
                try {
                  await prepare.mutateAsync({
                    action: 'prepare_client',
                    holdSlots: true,
                    experts,
                  });
                  onAsk(
                    `Draft an email sharing these expert profiles with the client for ${project.name}`,
                  );
                } catch (error) {
                  setShareError(error);
                }
              }}
            />
          ) : null}

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
        </div>
      </StreamedAnswer>
    </div>
  );
}

/**
 * Experts who answered, in the same compact columns as the ranked list: photo, name, how the
 * conversation happened, how many questions they answered, how many times they can take, and an
 * arrow that opens their answers.
 */
function AnswerTable({
  project,
  data,
  answered,
  times,
  selected,
  openId,
  isLocked,
  onToggle,
  onOpen,
}: {
  project: Project;
  data: ResponsesResult;
  answered: ExpertResponse[];
  times: Availability | undefined;
  selected: string[];
  openId: string | null;
  /** Once availability is confirmed, the picks are fixed. */
  isLocked: boolean;
  onToggle: (id: string, on: boolean) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className={search.tableScroll}>
      <table className={`${search.table} ${search.tableCompact}`} aria-label="Experts who answered">
        <thead>
          <tr>
            <th scope="col" className={search.pickCol}>
              <span className="cds--visually-hidden">Move forward</span>
            </th>
            <th scope="col" className={search.photoCol}>
              <span className="cds--visually-hidden">Photo</span>
            </th>
            <th scope="col">Name</th>
            <th scope="col" className={search.tightCol}>
              Source
            </th>
            <th scope="col" className={search.tightCol}>
              Answers
            </th>
            <th scope="col" className={search.tightCol}>
              Available slots
            </th>
            <th scope="col" className={search.viewCol}>
              <span className="cds--visually-hidden">View details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {answered.map((response, index) => {
            const name = nameOf(response);
            const isOpen = response.expertId === openId;
            const slots = times?.experts.find((expert) => expert.expertId === response.expertId)
              ?.slots.length;
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
                <td className={search.photoCol}>
                  <ExpertAvatar name={name} photoUrl={response.photoUrl} size="sm" />
                </td>
                <th scope="row" className={search.nameCell}>
                  {name}
                </th>
                <td className={search.tightCol}>
                  <ChannelMark
                    channel={conversationChannelFor(response.expertId, response.channel)}
                  />
                </td>
                <td className={search.tightCol}>
                  {response.answeredCount} / {data.questionCount}
                </td>
                <td className={search.tightCol}>{slots ?? '—'}</td>
                <td className={search.viewCol} onClick={(event) => event.stopPropagation()}>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={ArrowUpRight}
                    iconDescription={`View ${name}’s details`}
                    tooltipPosition="left"
                    tooltipAlignment="center"
                    aria-expanded={isOpen}
                    onClick={() => onOpen(response.expertId)}
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

const CHANNEL_ICONS = {
  linkedin: LogoLinkedin,
  email: Email,
  phone: Phone,
} as const;

/** Turns the ticked experts into the client email, then asks the assistant to show it. */
function ShareProfiles({
  project,
  selected,
  times,
  isBusy,
  error,
  onDismiss,
  onDraft,
}: {
  project: Project;
  selected: string[];
  times: Availability | undefined;
  isBusy: boolean;
  error: unknown;
  onDismiss: () => void;
  onDraft: (experts: { expertId: string; slotIds: string[] }[]) => Promise<void>;
}) {
  const client = project.contact.name.split(' ')[0] ?? project.contact.name;
  const experts = selected.flatMap((id) => {
    const slots = times?.experts.find((expert) => expert.expertId === id)?.slots ?? [];
    return slots.length > 0 ? [{ expertId: id, slotIds: slots.map((slot) => slot.id) }] : [];
  });
  const count = selected.length;
  return (
    <div className={styles.share}>
      <p>
        Share {count === 1 ? 'this profile' : `these ${count} profiles`} with{' '}
        <strong>{client}</strong> on <strong>{project.name}</strong>?
      </p>
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="The email didn’t start."
          subtitle={toUserMessage(error)}
          onCloseButtonClick={onDismiss}
        />
      ) : null}
      <Button disabled={experts.length === 0 || isBusy} onClick={() => void onDraft(experts)}>
        {isBusy ? 'Drafting…' : 'Draft the email'}
      </Button>
    </div>
  );
}

function ChannelMark({ channel }: { channel: ConversationChannel }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <span
      className={
        channel === 'linkedin' ? `${styles.channel} ${styles.channelLinkedin}` : styles.channel
      }
    >
      <Icon size={16} aria-hidden={true} />
      {CONVERSATION_CHANNEL_LABELS[channel]}
    </span>
  );
}
