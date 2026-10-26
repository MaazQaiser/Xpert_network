'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, ClickableTile, InlineLoading, SkeletonPlaceholder } from '@carbon/react';
import { ArrowUpRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { FloatingComposer } from '@/features/goal-chat';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { ErrorState } from '@/shared/ui';
import { useAskAssistant, useHomeSummary } from '../../api/queries';
import {
  CARD_PROMPTS,
  SUGGESTED_PROMPTS,
  type AssistantReply,
  type HomeSummary,
} from '../../model/home.schema';
import { ChatBlocks, ChatChips } from './ChatBlocks';
import styles from './AdminHome.module.scss';

function partOfDay(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function briefLede(summary: HomeSummary): string {
  const { newProjectEmails, expertsPendingReview, activeProjects } = summary;
  const emailWord = newProjectEmails === 1 ? 'email' : 'emails';
  const reviewWord = expertsPendingReview === 1 ? 'review is' : 'reviews are';
  const active = String(activeProjects).padStart(2, '0');
  return `We have ${newProjectEmails} new project ${emailWord}, ${expertsPendingReview} expert ${reviewWord} ready to review, and ${active} active projects.`;
}

type Turn = { id: string; question: string; answer: AssistantReply | null; error: unknown };

/** What the mascot shows: resting, working, or a short reaction to the last answer. */
type MascotMood = 'idle' | 'thinking' | 'happy' | 'oops';

// How long a reaction plays before the mascot settles back to idle (matches the CSS).
const REACTION_MS = 1200;

type SummaryCardProps = {
  href: string;
  label: string;
  value: number;
  action: string;
  onAsk: () => void;
};

// Carbon ClickableTile: the count, the label underneath, Carbon's corner arrow. A plain click asks
// the assistant (the answer opens in the chat below, AI-native); modified clicks (new tab, etc.)
// stay normal links to the page. The action is the accessible name.
function SummaryCard({ href, label, value, action, onAsk }: SummaryCardProps) {
  const ask = (event: MouseEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>) => {
    if (
      'button' in event &&
      (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
    )
      return;
    event.preventDefault();
    onAsk();
  };
  return (
    <li>
      <ClickableTile
        href={href}
        onClick={ask}
        renderIcon={ArrowUpRight}
        className={styles.countTile}
        aria-label={`${label}: ${value}. ${action}`}
      >
        {/* Shown as two digits (04, 12); screen readers get the plain number from the label. */}
        <span className={styles.cardValue}>{String(value).padStart(2, '0')}</span>
        <span className={styles.cardLabel}>{label}</span>
      </ClickableTile>
    </li>
  );
}

function SummaryCards({ summary, onAsk }: { summary: HomeSummary; onAsk: (q: string) => void }) {
  return (
    <ul className={styles.cards}>
      <SummaryCard
        href={routes.admin.inbox}
        label="New project emails"
        value={summary.newProjectEmails}
        action="Ask the assistant about today’s new project emails"
        onAsk={() => onAsk(CARD_PROMPTS.emails)}
      />
      <SummaryCard
        href={routes.admin.projects}
        label="Expert reviews ready"
        value={summary.expertsPendingReview}
        action="Ask the assistant which expert reviews need sign-off"
        onAsk={() => onAsk(CARD_PROMPTS.experts)}
      />
      <SummaryCard
        href={routes.admin.projects}
        label="Active projects"
        value={summary.activeProjects}
        action="Ask the assistant which active projects need you"
        onAsk={() => onAsk(CARD_PROMPTS.active)}
      />
    </ul>
  );
}

type TodayProps = {
  summary: ReturnType<typeof useHomeSummary>;
  onAsk: (question: string) => void;
};

/** The three counts as Carbon ClickableTiles ($layer-01). */
function Today({ summary, onAsk }: TodayProps) {
  return (
    <section className={styles.today} aria-label="Today’s summary">
      {summary.isPending ? (
        <div aria-busy="true" aria-label="Loading today’s summary" className={styles.cards}>
          {[0, 1, 2].map((i) => (
            <SkeletonPlaceholder key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      ) : summary.data ? (
        <SummaryCards summary={summary.data} onAsk={onAsk} />
      ) : (
        <ErrorState
          title="Today’s summary didn’t load"
          message={toUserMessage(summary.error)}
          onRetry={() => void summary.refetch()}
        />
      )}
    </section>
  );
}

/** PRD screen 01: greeting, today's summary, one AI tip and the assistant chat. */
export function AdminHome() {
  const session = useSession();
  const summary = useHomeSummary();
  const ask = useAskAssistant();
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnCount = useRef(0);
  const [reaction, setReaction] = useState<'happy' | 'oops' | null>(null);
  const name = session.data?.user?.name?.split(' ')[0];

  // A reaction plays once, then the mascot settles back to idle.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const mood: MascotMood = ask.isPending || summary.isPending ? 'thinking' : (reaction ?? 'idle');

  // Keep the newest question and its answer in view as the conversation grows.
  const latest = useRef<HTMLLIElement>(null);
  const lastTurn = turns.at(-1);
  useEffect(() => {
    latest.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [turns.length, lastTurn?.answer]);

  const send = (question: string) => {
    turnCount.current += 1;
    const id = `turn_${turnCount.current}`;
    setTurns((current) => [...current, { id, question, answer: null, error: null }]);
    ask.mutate(question, {
      onSuccess: (answer) => {
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, answer } : t)));
        setReaction('happy');
      },
      onError: (error) => {
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, error } : t)));
        setReaction('oops');
      },
    });
  };

  // Once a question is asked, the page becomes the conversation: the greeting, the count cards
  // and the suggestions leave, and the thread plus the ask field stay.
  const chatting = turns.length > 0;

  return (
    <div className={chatting ? `${styles.root} ${styles.chatting}` : styles.root}>
      <div className={styles.stage}>
        {chatting ? null : (
          <header className={styles.intro}>
            {/* Decorative: the line below names the assistant. Its mood mirrors the assistant:
              resting, perking up while you type, thinking, or reacting to an answer. */}
            <span className={styles.mascot} data-mood={mood} aria-hidden={true}>
              <Image
                src="/images/assistant-mascot.png"
                alt=""
                width={81}
                height={96}
                priority
                className={styles.mascotImage}
              />
            </span>
            <h1 className={styles.greeting}>
              {name ? `Hey ${name}, good ${partOfDay()}.` : `Good ${partOfDay()}.`}
            </h1>
            <p className={styles.lede}>
              {summary.data
                ? briefLede(summary.data)
                : 'Pulling together today’s emails, expert reviews and active projects…'}
            </p>
          </header>
        )}

        {chatting ? null : <Today summary={summary} onAsk={send} />}

        {chatting ? (
          <ol className={styles.thread} aria-label="Conversation with your AI assistant">
            {turns.map((turn, index) => (
              <li
                key={turn.id}
                className={styles.turn}
                ref={index === turns.length - 1 ? latest : undefined}
              >
                <p className={styles.question}>{turn.question}</p>
                {turn.answer ? (
                  <div className={styles.answer}>
                    <AIExplainLabel aria-label="AI answer" />
                    <div className={styles.answerBody}>
                      <p>{turn.answer.text}</p>
                      <ChatBlocks blocks={turn.answer.blocks} onAsk={send} isBusy={ask.isPending} />
                      <ChatChips chips={turn.answer.chips} onAsk={send} isBusy={ask.isPending} />
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
        {chatting ? null : (
          <ul className={styles.prompts} aria-label="Suggested questions">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <Button
                  kind="ghost"
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
        )}
        <FloatingComposer
          label="Ask your AI assistant"
          placeholder="Ask anything about your emails, projects or experts…"
          placement="inline"
          look="glow"
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
