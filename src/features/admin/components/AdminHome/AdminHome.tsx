'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, ClickableTile, SkeletonPlaceholder } from '@carbon/react';
import { ArrowUpRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { FloatingComposer } from '@/features/goal-chat';
import { AIExplainLabel, EmphasisText } from '@/shared/ai';
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
import { StreamedAnswer } from './StreamedAnswer';
import styles from './AdminHome.module.scss';

function partOfDay(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The greeting's one line, with the counts as pills. */
function briefLede(summary: HomeSummary): string {
  const { newProjectEmails, expertsPendingReview, activeProjects } = summary;
  const emailWord = newProjectEmails === 1 ? 'email' : 'emails';
  const reviews = expertsPendingReview === 1 ? 'review]] is' : 'reviews]] are';
  const projectWord = activeProjects === 1 ? 'project' : 'projects';
  // The expert reviews are what's waiting on the PM, so that count is the blue one.
  return `We have [[${newProjectEmails} new project ${emailWord}]], [[!${expertsPendingReview} expert ${reviews} ready to review, and [[${activeProjects} active ${projectWord}]].`;
}

type Turn = { id: string; question: string; answer: AssistantReply | null; error: unknown };

/** What the mascot shows: resting, working, or a short reaction to the last answer. */
type MascotMood = 'idle' | 'thinking' | 'happy' | 'oops';

// How long a reaction plays before the mascot settles back to idle (matches the CSS).
const REACTION_MS = 1200;
const IS_TEST = process.env.NODE_ENV === 'test';
// The shortest the assistant "thinks" before answering; none in tests.
const THINK_MS = IS_TEST ? 0 : 1400;
// The glide that brings a new question to the top, and where it stops (under the header).
const SCROLL_MS = 700;
const SCROLL_GAP_PX = 64;

/** Reduced motion, tests and background tabs skip the choreography and act at once. */
function actsAtOnce(): boolean {
  return (
    IS_TEST ||
    document.hidden ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

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
  // Answers whose AI is still working (the expert search), so their mascot shows it.
  const [working, setWorking] = useState<Record<string, boolean>>({});
  const setTurnWorking = (id: string, isWorking: boolean) =>
    setWorking((current) =>
      current[id] === isWorking ? current : { ...current, [id]: isWorking },
    );
  const name = session.data?.user?.name?.split(' ')[0];

  // A reaction plays once, then the mascot settles back to idle.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const mood: MascotMood = ask.isPending || summary.isPending ? 'thinking' : (reaction ?? 'idle');

  // A new question glides to the top of the view (like ChatGPT / Claude), pushing earlier turns
  // up; its answer then fills in below. Only on a new question, so reading isn't interrupted.
  const latest = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const element = latest.current;
    if (!element || IS_TEST) return;
    const from = window.scrollY;
    const to = element.getBoundingClientRect().top + from - SCROLL_GAP_PX;
    if (actsAtOnce()) {
      window.scrollTo(0, to);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const glide = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / SCROLL_MS);
      const eased = 1 - (1 - progress) ** 3; // ease-out: quick start, soft landing
      window.scrollTo(0, from + (to - from) * eased);
      if (progress < 1) frame = window.requestAnimationFrame(glide);
    };
    frame = window.requestAnimationFrame(glide);
    return () => window.cancelAnimationFrame(frame);
  }, [turns.length]);

  const isBusy = ask.isPending;

  const send = (question: string) => {
    turnCount.current += 1;
    const id = `turn_${turnCount.current}`;
    const askedAt = Date.now();
    setTurns((current) => [...current, { id, question, answer: null, error: null }]);
    ask.mutate(question, {
      onSuccess: (answer) => {
        // The assistant takes a breath before it answers, so the reply reads as considered.
        const wait = Math.max(0, THINK_MS - (Date.now() - askedAt));
        window.setTimeout(() => {
          setTurns((current) => current.map((t) => (t.id === id ? { ...t, answer } : t)));
          setReaction('happy');
        }, wait);
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
              {summary.data ? (
                <EmphasisText text={briefLede(summary.data)} />
              ) : (
                'Pulling together today’s emails, expert reviews and active projects…'
              )}
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
                    <AIExplainLabel aria-label="AI answer" isWorking={working[turn.id] ?? false} />
                    <div className={styles.answerBody}>
                      <StreamedAnswer text={turn.answer.text}>
                        <ChatBlocks
                          blocks={turn.answer.blocks}
                          onAsk={send}
                          isBusy={isBusy}
                          onWorking={(isWorking) => setTurnWorking(turn.id, isWorking)}
                        />
                        <ChatChips chips={turn.answer.chips} onAsk={send} isBusy={isBusy} />
                        {turn.answer.links.length > 0 ? (
                          <ul className={styles.links}>
                            {turn.answer.links.map((link) => (
                              <li key={link.href}>
                                <Link href={link.href}>{link.label}</Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </StreamedAnswer>
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
                  <div className={`${styles.answer} ${styles.thinkingRow}`} role="status">
                    <AIExplainLabel aria-label="Thinking" isWorking />
                    <p className={styles.thinking}>Thinking…</p>
                  </div>
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
                  disabled={isBusy}
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
          isBusy={isBusy}
          onSend={send}
        />
        <p className={styles.disclaimer}>
          AI can make mistakes. Check important details before sending to clients.
        </p>
      </div>
    </div>
  );
}
