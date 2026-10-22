'use client';

import { useEffect, useRef, useState, type TransitionEvent } from 'react';
import Link from 'next/link';
import { Add } from '@carbon/icons-react';
import { Accordion, AccordionItem, Button, ProgressBar } from '@carbon/react';
import { AsyncBoundary, NotFoundState, PageHeader, PageLoading, StatusTag } from '@/shared/ui';
import { useBreakpointUp } from '@/shared/hooks/useMediaQuery';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { useDemoAutoplay, useDemoChatBridge } from '@/features/prototype-toolbar';
import { useConversation } from '../../api/queries';
import { useStoryPlayback } from '../../hooks/useStoryPlayback';
import { useTurn } from '../../hooks/useTurn';
import { isHomeStoryBrief } from '../../model/homeStories';
import { STEP_IDS, STEP_LABELS, progressPercent, type StepId } from '../../model/steps';
import type { GoalType } from '../../model/brief.schema';
import type { Conversation } from '../../model/turn.schema';
import { ChatThread } from '../ChatThread/ChatThread';
import { FloatingComposer } from '../FloatingComposer/FloatingComposer';
import { ReportReview } from '../ReportReview/ReportReview';
import { ReportReviewProvider } from '../ReportReview/reportReviewContext';
import { StoryPlayer } from '../StoryPlayer/StoryPlayer';
import { takePendingPrompt } from '../../model/pendingPrompt';
import { LiveBriefPanel } from '../LiveBriefPanel/LiveBriefPanel';
import styles from './GoalChat.module.scss';

const PLACEHOLDERS: Partial<Record<StepId, string>> = {
  goal: 'Describe your goal in a sentence…',
  subject: 'Type a company, region or industry…',
  questions: 'Type a question to add it to the list…',
};

const STATUS = {
  draft: { tone: 'info', label: 'Draft' },
  confirmed: { tone: 'progress', label: 'Confirmed' },
  submitted: { tone: 'success', label: 'Submitted' },
} as const;

/** How long the report pane's flex-basis transition lasts, so a missed `transitionend` still unmounts it. */
function transitionMs(element: HTMLElement): number {
  const raw = getComputedStyle(element).transitionDuration.split(',')[0]?.trim() ?? '0s';
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

function GoalChatSkeleton() {
  return <PageLoading description="Loading your brief" inShell />;
}

type GoalChatViewProps = {
  data: Conversation;
  briefId: string;
  initialGoal: GoalType | null;
  autoPlay: boolean;
  layout: 'page' | 'stage';
};

function GoalChatView({ data, briefId, initialGoal, autoPlay, layout }: GoalChatViewProps) {
  const turn = useTurn(briefId);
  const isWide = useBreakpointUp('lg');
  const demoAutoplay = useDemoAutoplay();
  const { brief, messages } = data;
  const story = isHomeStoryBrief(brief.id);
  const playback = useStoryPlayback(story ? messages : [], story && (autoPlay || demoAutoplay));
  useDemoChatBridge({
    active: story,
    status: playback.status,
    play: playback.play,
    pause: playback.pause,
    replay: playback.replay,
    reset: playback.reset,
  });

  // A new brief opens with the assistant's first question. Deferred a tick so React's
  // strict-mode double mount doesn't start (and abort) two streams.
  const { send } = turn;
  // A goal typed on Home becomes the first message (read once, on first render).
  const [initialPrompt] = useState(() =>
    messages.length === 0 ? takePendingPrompt(briefId) : null,
  );
  useEffect(() => {
    if (messages.length > 0) return;
    const timer = window.setTimeout(
      () =>
        send(
          {
            kind: 'start',
            ...(initialGoal ? { goalType: initialGoal } : {}),
            ...(initialPrompt ? { text: initialPrompt } : {}),
          },
          initialPrompt,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
    // Only when the conversation is empty; `send` identity changes every stream update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const [reportId, setReportId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const reportPaneRef = useRef<HTMLDivElement>(null);
  const reportCloseTimer = useRef(0);
  const reportOpenTimer = useRef(0);
  const percent = progressPercent(brief.stepStatus);
  const doneCount = STEP_IDS.filter(
    (id) => brief.stepStatus[id] === 'done' || brief.stepStatus[id] === 'attention',
  ).length;
  const status = STATUS[brief.status];

  const progressText = `${doneCount} of ${STEP_IDS.length} steps complete${
    brief.status === 'submitted' ? '' : ` · now: ${STEP_LABELS[brief.currentStep].label}`
  }`;
  const panel = (
    <LiveBriefPanel
      brief={brief}
      isBusy={turn.isBusy}
      readOnly={story}
      onRevisit={(step) => turn.send({ kind: 'revisit', step })}
    />
  );

  const finishReportClose = () => {
    window.clearTimeout(reportCloseTimer.current);
    setReportId(null);
  };

  const openReport = (id: string) => {
    if (!id) return;
    window.clearTimeout(reportCloseTimer.current);
    window.clearTimeout(reportOpenTimer.current);
    setReportId(id);
    if (reportOpen) return;
    const open = () => {
      window.clearTimeout(reportOpenTimer.current);
      setReportOpen(true);
    };
    // Two frames lets the closed pane paint, so the width can animate open.
    // The timeout covers a browser that drops those animation frames.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(open);
    });
    reportOpenTimer.current = window.setTimeout(open, 48);
  };

  const closeReport = () => {
    window.clearTimeout(reportOpenTimer.current);
    setReportOpen(false);
    window.clearTimeout(reportCloseTimer.current);
    const pane = reportPaneRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A short grace past the CSS duration, in case `transitionend` never arrives.
    const duration = reduce || !pane ? 0 : transitionMs(pane) + 50;
    reportCloseTimer.current = window.setTimeout(finishReportClose, duration);
  };

  const onReportTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'flex-basis') return;
    if (!reportOpen) finishReportClose();
  };

  useEffect(
    () => () => {
      window.clearTimeout(reportCloseTimer.current);
      window.clearTimeout(reportOpenTimer.current);
    },
    [],
  );

  const stepNumber = Math.min(STEP_IDS.length, doneCount + (brief.status === 'submitted' ? 0 : 1));

  if (layout === 'stage') {
    return (
      <ReportReviewProvider onOpen={openReport}>
        <div className={styles.stageRoot}>
          <div
            className={
              reportOpen ? `${styles.workspace} ${styles.workspaceOpen}` : styles.workspace
            }
          >
            <div className={styles.stageChat}>
              <div className={styles.stageTop}>
                <div className={styles.progressWidget}>
                  <p className={styles.progressLabel}>
                    <span>{STEP_LABELS[brief.currentStep].label}</span>
                    <span>
                      {stepNumber} of {STEP_IDS.length}
                    </span>
                  </p>
                  <ProgressBar
                    label="Brief progress"
                    hideLabel
                    value={percent}
                    max={100}
                    size="small"
                    {...(brief.status === 'submitted' ? { status: 'finished' as const } : {})}
                  />
                </div>
              </div>
              <div className={styles.stageColumn}>
                <div className={styles.stageThread}>
                  <ChatThread brief={brief} messages={messages} turn={turn} />
                </div>
                <FloatingComposer
                  autoFocus
                  label="Message the research assistant"
                  placeholder={PLACEHOLDERS[brief.currentStep] ?? 'Type a message…'}
                  isBusy={turn.isBusy}
                  isDisabled={brief.status === 'submitted'}
                  disabledHint="This brief is submitted. Start a new brief to research something else."
                  onSend={(text) => turn.send({ kind: 'text', text }, text)}
                />
              </div>
            </div>
            <div
              ref={reportPaneRef}
              className={styles.reportPane}
              onTransitionEnd={onReportTransitionEnd}
            >
              {reportId ? <ReportReview reportId={reportId} onClose={closeReport} /> : null}
            </div>
          </div>
        </div>
      </ReportReviewProvider>
    );
  }

  return (
    <>
      {/* Thin filling bar pinned under the header; the brief panel is the detailed check. */}
      <div className={styles.progress}>
        <ProgressBar
          label="Brief progress"
          hideLabel
          value={percent}
          max={100}
          size="small"
          {...(brief.status === 'submitted' ? { status: 'finished' as const } : {})}
        />
      </div>
      <PageHeader
        title={brief.title === 'Untitled brief' ? 'New research brief' : brief.title}
        breadcrumbs={[{ label: 'Home', href: routes.client.home }]}
        subtitle={
          <>
            {progressText} · Saved automatically ·{' '}
            <time dateTime={brief.updatedAt} title={formatDateTime(brief.updatedAt)}>
              updated {formatRelative(brief.updatedAt)}
            </time>
          </>
        }
        actions={<StatusTag tone={status.tone} label={status.label} />}
      />
      <div className={styles.layout}>
        <div className={styles.chat}>
          {isWide ? null : (
            <Accordion className={styles.briefAccordion}>
              <AccordionItem title={`Research brief · ${doneCount} of ${STEP_IDS.length} done`}>
                {panel}
              </AccordionItem>
            </Accordion>
          )}
          {story ? (
            <StoryPlayer
              status={playback.status}
              position={playback.position}
              total={messages.length}
              onPlay={playback.play}
              onPause={playback.pause}
              onReplay={playback.replay}
            >
              <ChatThread
                brief={brief}
                messages={playback.visible}
                turn={turn}
                playback={{
                  streamingId: playback.streamingId,
                  showTyping: playback.typing,
                  follow: playback.reduced ? 'auto' : 'smooth',
                }}
              />
            </StoryPlayer>
          ) : (
            <>
              <ChatThread brief={brief} messages={messages} turn={turn} />
              <FloatingComposer
                label="Message the research assistant"
                placeholder={PLACEHOLDERS[brief.currentStep] ?? 'Type a message…'}
                isBusy={turn.isBusy}
                isDisabled={brief.status === 'submitted'}
                disabledHint="This brief is submitted. Start a new brief to research something else."
                leading={
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={Add}
                    iconDescription="New research brief"
                    tooltipPosition="top"
                    as={Link}
                    href={routes.client.ask}
                  />
                }
                onSend={(text) => turn.send({ kind: 'text', text }, text)}
              />
            </>
          )}
        </div>
        {isWide ? panel : null}
      </div>
    </>
  );
}

/** F2 ★ goal chat: stepper + chat + live brief (PRODUCT_PLAN §5). */
export function GoalChat({
  briefId,
  initialGoal = null,
  autoPlay = false,
  layout = 'page',
}: {
  briefId: string;
  /** Goal chosen during onboarding (F1); used only for the first turn of an empty brief. */
  initialGoal?: GoalType | null;
  /** Presenter started the seeded chat from home. */
  autoPlay?: boolean;
  /** `stage` replaces the home greeting. `page` is the standalone brief route. */
  layout?: 'page' | 'stage';
}) {
  const conversation = useConversation(briefId);
  return (
    <AsyncBoundary
      query={conversation}
      loading={<GoalChatSkeleton />}
      errorTitle="Your brief didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that brief"
          message="It may have been deleted, or the link is incomplete. You can start a new goal any time."
          backHref="/ask"
          backLabel="Start a new goal"
        />
      }
    >
      {(data) => (
        <GoalChatView
          data={data}
          briefId={briefId}
          initialGoal={initialGoal}
          autoPlay={autoPlay}
          layout={layout}
        />
      )}
    </AsyncBoundary>
  );
}
