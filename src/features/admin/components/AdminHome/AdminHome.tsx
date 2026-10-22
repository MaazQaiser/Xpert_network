'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, InlineLoading, SkeletonPlaceholder, Tag } from '@carbon/react';
import { ArrowRight, Email, Folders, MagicWand, UserMultiple } from '@carbon/icons-react';
import type { ComponentType } from 'react';
import { useSession } from '@/features/auth';
import { FloatingComposer } from '@/features/goal-chat';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { ErrorState } from '@/shared/ui';
import { useAskAssistant, useHomeSummary } from '../../api/queries';
import { SUGGESTED_PROMPTS, type AssistantReply, type HomeSummary } from '../../model/home.schema';
import styles from './AdminHome.module.scss';

function partOfDay(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

type Turn = { id: string; question: string; answer: AssistantReply | null; error: unknown };

type SummaryCardProps = {
  href: string;
  label: string;
  value: number;
  action: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

function SummaryCard({ href, label, value, action, icon: Icon }: SummaryCardProps) {
  return (
    <li>
      <Link href={href} className={styles.card} aria-label={`${label}: ${value}. ${action}`}>
        <span className={styles.cardTop}>
          <span className={styles.cardLabel}>{label}</span>
          <Icon className={styles.cardIcon} aria-hidden={true} />
        </span>
        <span className={styles.cardValue}>{value}</span>
        <span className={styles.cardAction}>
          {action} <ArrowRight aria-hidden={true} />
        </span>
      </Link>
    </li>
  );
}

function Summary({ summary }: { summary: HomeSummary }) {
  return (
    <>
      <ul className={styles.cards} aria-label="Today’s summary">
        <SummaryCard
          href={routes.admin.inbox}
          label="Emails received today"
          value={summary.emailsToday}
          action="Open inbox"
          icon={Email}
        />
        <SummaryCard
          href={routes.admin.projects}
          label="Experts pending review"
          value={summary.expertsPendingReview}
          action="Review experts"
          icon={UserMultiple}
        />
        <SummaryCard
          href={routes.admin.projects}
          label="New projects today"
          value={summary.newProjectsToday}
          action="Review projects"
          icon={Folders}
        />
      </ul>
      {summary.tip ? (
        <div className={styles.tip}>
          <AIExplainLabel
            summary="Suggested from today’s inbox and project files."
            basis="Draft projects, open confirmations and requested call dates"
            aria-label="AI tip"
          />
          <p>
            <Link href={summary.tip.href} className={styles.tipLead}>
              {summary.tip.lead}
            </Link>{' '}
            · {summary.tip.detail}
          </p>
        </div>
      ) : null}
    </>
  );
}

/** PRD screen 01: greeting, today's summary, one AI tip and the assistant chat. */
export function AdminHome() {
  const session = useSession();
  const summary = useHomeSummary();
  const ask = useAskAssistant();
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnCount = useRef(0);
  const name = session.data?.user?.name;

  const send = (question: string) => {
    turnCount.current += 1;
    const id = `turn_${turnCount.current}`;
    setTurns((current) => [...current, { id, question, answer: null, error: null }]);
    ask.mutate(question, {
      onSuccess: (answer) =>
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, answer } : t))),
      onError: (error) =>
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, error } : t))),
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <header className={styles.intro}>
          <Tag type="high-contrast" size="sm" renderIcon={MagicWand} className={styles.eyebrow}>
            Your AI assistant
          </Tag>
          <h1 className={styles.greeting}>
            {name ? `Hey ${name}, good ${partOfDay()}.` : `Good ${partOfDay()}.`}
          </h1>
          <p className={styles.lede}>
            Here’s what came in while you were away. I’ve already read the emails and drafted
            project files. They just need your eyes.
          </p>
        </header>

        {summary.isPending ? (
          <div aria-busy="true" aria-label="Loading today’s summary" className={styles.cards}>
            {[0, 1, 2].map((i) => (
              <SkeletonPlaceholder key={i} className={styles.cardSkeleton} />
            ))}
          </div>
        ) : summary.data ? (
          <Summary summary={summary.data} />
        ) : (
          <ErrorState
            title="Today’s summary didn’t load"
            message={toUserMessage(summary.error)}
            onRetry={() => void summary.refetch()}
          />
        )}

        {turns.length > 0 ? (
          <ol className={styles.thread} aria-label="Conversation with your AI assistant">
            {turns.map((turn) => (
              <li key={turn.id} className={styles.turn}>
                <p className={styles.question}>{turn.question}</p>
                {turn.answer ? (
                  <div className={styles.answer}>
                    <AIExplainLabel
                      summary="Answered from your inbox and project files."
                      basis={turn.answer.basis}
                      aria-label="AI answer"
                    />
                    <div>
                      <p>{turn.answer.text}</p>
                      {turn.answer.links.length > 0 ? (
                        <ul className={styles.links}>
                          {turn.answer.links.map((link) => (
                            <li key={link.href}>
                              <Link href={link.href}>{link.label}</Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ) : turn.error ? (
                  <p className={styles.answerError} role="alert">
                    {toUserMessage(turn.error)}{' '}
                    <Button kind="ghost" size="sm" onClick={() => send(turn.question)}>
                      Ask again
                    </Button>
                  </p>
                ) : (
                  <InlineLoading description="Thinking…" />
                )}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className={styles.ask}>
        <ul className={styles.prompts} aria-label="Suggested questions">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <Button
                kind="tertiary"
                size="sm"
                className={styles.prompt}
                onClick={() => send(prompt)}
                disabled={ask.isPending}
              >
                {prompt}
              </Button>
            </li>
          ))}
        </ul>
        <FloatingComposer
          label="Ask your AI assistant"
          placeholder="Ask anything about your emails, projects or experts…"
          placement="inline"
          isBusy={ask.isPending}
          onSend={send}
        />
        <p className={styles.disclaimer}>
          AI can make mistakes. Check important details before sending to clients.
        </p>
      </div>
    </div>
  );
}
