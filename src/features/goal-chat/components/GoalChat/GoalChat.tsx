'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Add } from '@carbon/icons-react';
import { Button, ProgressBar, SkeletonPlaceholder, SkeletonText } from '@carbon/react';
import { AsyncBoundary, NotFoundState, PageHeader, StatusTag } from '@/shared/ui';
import { useBreakpointUp } from '@/shared/hooks/useMediaQuery';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { useConversation } from '../../api/queries';
import { useTurn } from '../../hooks/useTurn';
import { STEP_IDS, progressPercent, type StepId } from '../../model/steps';
import type { GoalType } from '../../model/brief.schema';
import type { Conversation } from '../../model/turn.schema';
import { BriefStepper } from '../BriefStepper/BriefStepper';
import { ChatThread } from '../ChatThread/ChatThread';
import { FloatingComposer } from '../FloatingComposer/FloatingComposer';
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

function GoalChatSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading your brief">
      <SkeletonText paragraph lineCount={7} />
      <div className={styles.chat}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={3} />
        <SkeletonPlaceholder className={styles.skeletonBlock} />
      </div>
    </div>
  );
}

type GoalChatViewProps = { data: Conversation; briefId: string; initialGoal: GoalType | null };

function GoalChatView({ data, briefId, initialGoal }: GoalChatViewProps) {
  const turn = useTurn(briefId);
  const isWide = useBreakpointUp('xlg');
  const { brief, messages } = data;

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

  const percent = progressPercent(brief.stepStatus);
  const doneCount = STEP_IDS.filter(
    (id) => brief.stepStatus[id] === 'done' || brief.stepStatus[id] === 'attention',
  ).length;
  const status = STATUS[brief.status];

  return (
    <>
      <PageHeader
        title={brief.title === 'Untitled brief' ? 'New research brief' : brief.title}
        breadcrumbs={[{ label: 'Home', href: routes.client.home }]}
        subtitle={
          <>
            Saved automatically ·{' '}
            <time dateTime={brief.updatedAt} title={formatDateTime(brief.updatedAt)}>
              updated {formatRelative(brief.updatedAt)}
            </time>
          </>
        }
        actions={<StatusTag tone={status.tone} label={status.label} />}
      >
        <ProgressBar
          label="Brief progress"
          value={percent}
          max={100}
          helperText={`${doneCount} of ${STEP_IDS.length} steps complete`}
          size="small"
        />
      </PageHeader>
      <div className={styles.layout}>
        <BriefStepper
          brief={brief}
          isBusy={turn.isBusy}
          onRevisit={(step) => turn.send({ kind: 'revisit', step })}
        />
        <div className={styles.chat}>
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
        </div>
        {isWide ? <LiveBriefPanel brief={brief} /> : null}
      </div>
    </>
  );
}

/** F2 ★ goal chat: stepper + chat + live brief (PRODUCT_PLAN §5). */
export function GoalChat({
  briefId,
  initialGoal = null,
}: {
  briefId: string;
  /** Goal chosen during onboarding (F1); used only for the first turn of an empty brief. */
  initialGoal?: GoalType | null;
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
      {(data) => <GoalChatView data={data} briefId={briefId} initialGoal={initialGoal} />}
    </AsyncBoundary>
  );
}
