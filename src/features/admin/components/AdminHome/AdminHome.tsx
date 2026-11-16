'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button, ClickableTile, SkeletonPlaceholder } from '@carbon/react';
import { ArrowUpRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { FloatingComposer } from '@/features/goal-chat';
import { AIExplainLabel, aiStreamEventSchema, EmphasisText, type AIPlanItem } from '@/shared/ai';
import { ApiError, streamEvents, toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { ErrorState } from '@/shared/ui';
import { adminKeys, useHomeSummary, useScioConversation } from '../../api/queries';
import {
  CARD_PROMPTS,
  SUGGESTED_PROMPTS,
  scioReplySchema,
  type HomeSummary,
  type ScioConversation,
  type ScioConversationDetail,
  type ScioReply,
} from '../../model/home.schema';
import { ChatBlocks, ChatChips } from './ChatBlocks';
import { RequirementsPanel } from './RequirementsPanel';
import { ScioSteps, type ScioStep } from './ScioSteps';
import { ScioText } from './ScioText';
import styles from './AdminHome.module.scss';

function partOfDay(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The greeting's brief: what came in, what needs a sign-off, and what's still open. */
function briefLede(summary: HomeSummary): string {
  const { newProjectEmails, expertsPendingReview, activeProjects, bookingEmail } = summary;
  const emailSentence =
    newProjectEmails === 0
      ? 'No new project emails came in.'
      : newProjectEmails === 1
        ? '[[1 new project email]] came in.'
        : `[[${newProjectEmails} new project emails]] came in.`;
  // The reviews are the item that needs the PM, unless a client is already waiting to book.
  const reviewMark = bookingEmail ? '' : '!';
  const reviewClause =
    expertsPendingReview === 0
      ? 'No expert reviews are ready'
      : expertsPendingReview === 1
        ? `[[${reviewMark}1 expert review]] is ready`
        : `[[${reviewMark}${expertsPendingReview} expert reviews]] are ready`;
  const projectClause =
    activeProjects === 0
      ? 'no projects are active'
      : activeProjects === 1
        ? '[[1 project]] is active'
        : `[[${activeProjects} projects]] are active`;
  const counts = `${emailSentence}\n${reviewClause}, and ${projectClause}.`;
  if (!bookingEmail) return counts;
  const first = bookingEmail.fromName.split(' ')[0] ?? bookingEmail.fromName;
  const calls = bookingEmail.pickCount === 1 ? '1 expert' : `${bookingEmail.pickCount} experts`;
  return `[[!${first} wants to book ${calls}.]] ${counts}`;
}

/** One question to Scio and its answer, which streams in. */
type Turn = {
  id: string;
  question: string;
  /** What the person said. The question sent to Scio can carry an id this hides. */
  spoken: string;
  status: 'streaming' | 'done' | 'error' | 'stopped';
  /** The answer's text so far. */
  text: string;
  /** What Scio did and is doing ("Checking new briefs…"), shown until the answer is in. */
  steps: ScioStep[];
  /** Scio's plan, when it made one for this answer. */
  plan: AIPlanItem[] | null;
  /** The finished answer: text, cards and next-step pills. */
  answer: ScioReply | null;
  error: string | null;
};

const scioEventSchema = aiStreamEventSchema(scioReplySchema);

/** The chat a Home URL points to: /admin/home/chat/<id>, or none for a new chat. */
function chatIdFrom(pathname: string): string | null {
  const prefix = `${routes.admin.home}/chat/`;
  return pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) : null;
}

/** A new chat's id (the backend accepts letters, digits, - and _). */
function newChatId(): string {
  return `chat_${crypto.randomUUID().replace(/-/g, '')}`;
}

/** A step started or finished: steps with an id update in place; others just follow on. */
function withStep(
  steps: ScioStep[],
  event: { id?: string | undefined; label: string; status?: 'running' | 'done' | undefined },
): ScioStep[] {
  const status = event.status ?? 'running';
  if (event.id && steps.some((s) => s.id === event.id)) {
    return steps.map((s) => (s.id === event.id ? { ...s, label: event.label, status } : s));
  }
  // A step without progress of its own ends when the next one starts.
  const earlier = event.id ? steps : steps.map((s) => ({ ...s, status: 'done' as const }));
  return [...earlier, { id: event.id ?? `step_${steps.length}`, label: event.label, status }];
}

/** A saved chat's messages as finished turns. */
function savedTurns(chat: ScioConversationDetail | undefined): Turn[] {
  const turns: Turn[] = [];
  for (const message of chat?.messages ?? []) {
    if (message.role === 'user') {
      turns.push({
        id: `saved_${turns.length}`,
        question: message.text,
        spoken: message.text,
        status: 'error',
        text: '',
        steps: [],
        plan: null,
        answer: null,
        error: 'No answer was saved for this question.',
      });
    } else {
      const last = turns.at(-1);
      if (last)
        Object.assign(last, {
          status: 'done',
          text: message.text,
          answer: message.result,
          error: null,
        });
    }
  }
  return turns;
}

/** What the mascot shows: resting, working, or a short reaction to the last answer. */
type MascotMood = 'idle' | 'thinking' | 'happy' | 'oops';

// How long a reaction plays before the mascot settles back to idle (matches the CSS).
const REACTION_MS = 1200;
const IS_TEST = process.env.NODE_ENV === 'test';
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

/** A turn's answer: streaming text with what Scio is doing, then its cards and pills. */
function TurnAnswer({
  turn,
  isBusy,
  onAsk,
  onHome,
  onStop,
  onWorking,
  isWorking,
  onOpenRequirements,
}: {
  turn: Turn;
  isBusy: boolean;
  onAsk: (question: string, spoken?: string) => void;
  onHome: () => void;
  onStop: () => void;
  onWorking: (isWorking: boolean) => void;
  isWorking: boolean;
  onOpenRequirements: (briefId: string) => void;
}) {
  const streaming = turn.status === 'streaming';
  const askAgain = (
    <Button kind="ghost" size="sm" onClick={() => onAsk(turn.question, turn.spoken)}>
      Ask again
    </Button>
  );

  return (
    <div className={styles.answer}>
      <AIExplainLabel
        aria-label={streaming ? 'Scio is working' : 'AI answer'}
        isWorking={streaming || isWorking}
      />
      <div className={styles.answerBody}>
        {/* Its steps while it works; they go once the answer is complete. */}
        {streaming ? (
          <ScioSteps steps={turn.steps} plan={turn.plan} isWriting={turn.text.length > 0} />
        ) : null}
        {turn.text ? (
          <div aria-live={streaming ? 'polite' : undefined}>
            <ScioText text={turn.text} />
          </div>
        ) : null}
        {streaming ? (
          <Button kind="ghost" size="sm" className={styles.stop} onClick={onStop}>
            Stop
          </Button>
        ) : null}
        {turn.status === 'stopped' ? <p className={styles.thinking}>Stopped. {askAgain}</p> : null}
        {turn.status === 'error' ? (
          <p className={styles.answerError} role="alert">
            {turn.error} {askAgain}
          </p>
        ) : null}
        {turn.answer ? (
          <>
            <ChatBlocks
              blocks={turn.answer.blocks}
              onAsk={onAsk}
              isBusy={isBusy}
              onHome={onHome}
              onWorking={onWorking}
              onOpenRequirements={onOpenRequirements}
            />
            <ChatChips chips={turn.answer.chips} onAsk={onAsk} isBusy={isBusy} />
            {turn.answer.links.length > 0 ? (
              <ul className={styles.links}>
                {turn.answer.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {turn.answer.basis ? (
              <p className={styles.basis}>Based on: {turn.answer.basis}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** PRD screen 01: greeting, today's summary and the chat with Scio, the AI assistant. */
export function AdminHome() {
  const session = useSession();
  const summary = useHomeSummary();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const routeChatId = chatIdFrom(pathname);

  // The chat on screen: none until the first question, a saved one when its URL is opened.
  const [conversationId, setConversationId] = useState<string | null>(routeChatId);
  const [historyId, setHistoryId] = useState<string | null>(routeChatId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [seenRouteChatId, setSeenRouteChatId] = useState<string | null>(routeChatId);
  // The brief whose requirements are open beside the chat.
  const [requirementsFor, setRequirementsFor] = useState<string | null>(null);
  // Counts moves to another chat, so an answer still streaming in the old one stops.
  const [chatSwitches, setChatSwitches] = useState(0);
  // The URL moved to another chat, or back to Home (a new chat). The URL of the chat started
  // here (set after its first question) changes nothing.
  if (routeChatId !== seenRouteChatId) {
    setSeenRouteChatId(routeChatId);
    if (routeChatId !== conversationId) {
      setConversationId(routeChatId);
      setHistoryId(routeChatId);
      setTurns([]);
      setRequirementsFor(null);
      setChatSwitches((n) => n + 1);
    }
  }
  const history = useScioConversation(historyId);
  const shownTurns = useMemo(() => [...savedTurns(history.data), ...turns], [history.data, turns]);

  const turnCount = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [reaction, setReaction] = useState<'happy' | 'oops' | null>(null);
  // Answers whose AI is still working (the expert search), so their mascot shows it.
  const [working, setWorking] = useState<Record<string, boolean>>({});
  const setTurnWorking = (id: string, isWorking: boolean) =>
    setWorking((current) =>
      current[id] === isWorking ? current : { ...current, [id]: isWorking },
    );
  const name = session.data?.user?.name?.split(' ')[0];

  // Leaving a chat (or Home) stops its answer.
  useEffect(() => () => controller.current?.abort(), [chatSwitches]);

  // A reaction plays once, then the mascot settles back to idle.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const isBusy = turns.some((t) => t.status === 'streaming');
  const mood: MascotMood = isBusy || summary.isPending ? 'thinking' : (reaction ?? 'idle');

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
  }, [shownTurns.length]);

  const goHome = () => {
    router.push(routes.admin.home);
    window.scrollTo(0, 0);
    void summary.refetch();
  };

  const patchTurn = (id: string, patch: (turn: Turn) => Partial<Turn>) =>
    setTurns((current) => current.map((t) => (t.id === id ? { ...t, ...patch(t) } : t)));

  // The chat list under Home: this chat moves to the top, named once its first answer is in.
  const listChat = (chat: ScioReply['conversation']) =>
    queryClient.setQueryData<ScioConversation[]>(adminKeys.scioChats(), (list = []) => [
      { id: chat.id, title: chat.title ?? 'New chat', updatedAt: new Date().toISOString() },
      ...list.filter((c) => c.id !== chat.id),
    ]);

  const send = async (question: string, spoken = question) => {
    const chatId = conversationId ?? newChatId();
    if (conversationId === null) {
      setConversationId(chatId);
      // The chat gets its own address, so it can be reopened from the side nav.
      router.replace(routes.admin.homeChat(chatId), { scroll: false });
    }
    turnCount.current += 1;
    const id = `turn_${turnCount.current}`;
    setTurns((current) => [
      ...current,
      {
        id,
        question,
        spoken,
        status: 'streaming',
        text: '',
        steps: [],
        plan: null,
        answer: null,
        error: null,
      },
    ]);

    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      for await (const event of streamEvents(
        '/scio/chat',
        { conversationId: chatId, message: question },
        scioEventSchema,
        abort.signal,
      )) {
        if (event.type === 'step') {
          patchTurn(id, (t) => ({ steps: withStep(t.steps, event) }));
        } else if (event.type === 'plan') {
          patchTurn(id, () => ({ plan: event.items }));
        } else if (event.type === 'token') {
          patchTurn(id, (t) => ({ text: t.text + event.text }));
        } else if (event.type === 'error') {
          patchTurn(id, () => ({ status: 'error', error: event.message }));
          setReaction('oops');
          return;
        } else {
          const answer = event.result as ScioReply;
          patchTurn(id, () => ({ status: 'done', text: answer.text, answer }));
          // Requirements Scio just extracted open beside the chat, fresh from the server.
          const extracted = answer.blocks.find((b) => b.kind === 'briefRequirements');
          if (extracted?.kind === 'briefRequirements') {
            void queryClient.invalidateQueries({
              queryKey: adminKeys.requirements(extracted.briefId),
            });
            setRequirementsFor(extracted.briefId);
          }
          listChat(answer.conversation);
          setReaction('happy');
          return;
        }
      }
      patchTurn(id, () => ({ status: 'error', error: 'The answer stopped early. Ask again.' }));
    } catch (error) {
      if (abort.signal.aborted) {
        patchTurn(id, () => ({ status: 'stopped' }));
        return;
      }
      patchTurn(id, () => ({
        status: 'error',
        error:
          error instanceof ApiError || error instanceof Error
            ? toUserMessage(error)
            : 'Something went wrong.',
      }));
      setReaction('oops');
    }
  };

  const ask = (question: string, spoken?: string) => void send(question, spoken);

  // Once a question is asked (or a saved chat opens), the page becomes the conversation: the
  // greeting, the count cards and the suggestions leave, and the thread plus the ask field stay.
  const chatting = shownTurns.length > 0 || historyId !== null;

  return (
    // The chat, with a brief's requirements beside it when they're open.
    <div className={requirementsFor ? `${styles.layout} ${styles.withPanel}` : styles.layout}>
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
                      .split('\n')
                      .map((line, index) => (
                        <span key={line} className={styles.ledeLine}>
                          {index > 0 ? ' ' : null}
                          <EmphasisText text={line} />
                        </span>
                      ))
                  : 'Pulling together today’s emails, expert reviews and active projects…'}
              </p>
              {summary.data?.bookingEmail ? (
                <button
                  type="button"
                  className={styles.cue}
                  onClick={() => {
                    const email = summary.data?.bookingEmail;
                    if (!email) return;
                    const first = email.fromName.split(' ')[0] ?? email.fromName;
                    const calls = email.pickCount === 1 ? '1 expert' : `${email.pickCount} experts`;
                    ask(
                      `Tell me about the email ${email.requestId}`,
                      `${first} replied. Book ${calls}.`,
                    );
                  }}
                >
                  <span className={styles.cueBody}>
                    <span className={styles.cueTitle}>
                      {summary.data.bookingEmail.fromName} replied
                    </span>
                    <span className={styles.cueSubject}>{summary.data.bookingEmail.subject}</span>
                  </span>
                  <span className={styles.cueAction}>
                    Book {summary.data.bookingEmail.pickCount}{' '}
                    {summary.data.bookingEmail.pickCount === 1 ? 'expert' : 'experts'}
                  </span>
                </button>
              ) : null}
            </header>
          )}

          {chatting ? null : <Today summary={summary} onAsk={ask} />}

          {chatting ? (
            <>
              {history.isPending && historyId !== null ? (
                <p className={styles.thinking} role="status">
                  Opening the chat…
                </p>
              ) : history.isError ? (
                <ErrorState
                  title={
                    history.error instanceof ApiError && history.error.status === 404
                      ? 'This chat doesn’t exist any more'
                      : 'The chat didn’t load'
                  }
                  message={toUserMessage(history.error)}
                  onRetry={() => void history.refetch()}
                />
              ) : null}
              <ol className={styles.thread} aria-label="Conversation with Scio">
                {shownTurns.map((turn, index) => (
                  <li
                    key={turn.id}
                    className={styles.turn}
                    ref={index === shownTurns.length - 1 ? latest : undefined}
                  >
                    <p className={styles.question}>{turn.spoken}</p>
                    <TurnAnswer
                      turn={turn}
                      isBusy={isBusy}
                      onAsk={ask}
                      onHome={goHome}
                      onStop={() => controller.current?.abort()}
                      onWorking={(isWorking) => setTurnWorking(turn.id, isWorking)}
                      isWorking={working[turn.id] ?? false}
                      onOpenRequirements={setRequirementsFor}
                    />
                  </li>
                ))}
              </ol>
            </>
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
                    onClick={() => ask(prompt)}
                    disabled={isBusy}
                  >
                    {prompt}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <FloatingComposer
            label="Ask Scio"
            placeholder="Ask Scio about new briefs, or anything else…"
            placement="inline"
            look="glow"
            isBusy={isBusy}
            onSend={(text) => ask(text)}
          />
          <p className={styles.disclaimer}>
            AI can make mistakes. Check important details before sending to clients.
          </p>
        </div>
      </div>
      {requirementsFor ? (
        <RequirementsPanel
          key={requirementsFor}
          briefId={requirementsFor}
          onClose={() => setRequirementsFor(null)}
        />
      ) : null}
    </div>
  );
}
