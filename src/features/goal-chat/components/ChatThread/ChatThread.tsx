'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@carbon/react';
import { Renew, StopFilledAlt } from '@carbon/icons-react';
import { AIExplainLabel, AIFeedback, AIStepIndicator, StreamingText } from '@/shared/ai';
import { ErrorState } from '@/shared/ui';
import { formatDate, formatDateTime, formatRelative } from '@/shared/lib/dates';
import type { ResearchBrief } from '../../model/brief.schema';
import type { ChatMessage } from '../../model/message.schema';
import type { TurnController } from '../../hooks/useTurn';
import { WidgetView } from './MessageView';
import styles from './ChatThread.module.scss';

type ChatThreadProps = {
  brief: ResearchBrief;
  messages: ChatMessage[];
  turn: TurnController;
  /** Seeded story: messages arrive one at a time, with a typing row and streamed reply. */
  playback?: {
    streamingId: string | null;
    showTyping: boolean;
    follow: 'smooth' | 'auto';
  };
};

function AssistantFooter({ at, messageId }: { at: string; messageId?: string }) {
  return (
    <div className={styles.footer}>
      <AIExplainLabel
        size="mini"
        aria-label="About this reply"
        summary="Written by Xpert Network’s research assistant to scope your brief. It doesn’t give investment advice."
        basis="Your answers in this chat and the Xpert Network library catalogue"
      />
      <time dateTime={at} title={formatDateTime(at)} className={styles.time}>
        {formatRelative(at)}
      </time>
      {messageId ? <AIFeedback responseId={messageId} /> : null}
    </div>
  );
}

function dayLabel(iso: string, now: Date = new Date()): string {
  const day = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(day)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(iso);
}

function DayDivider({ label }: { label: string }) {
  return (
    <li className={styles.divider}>
      <span className={styles.dividerLabel}>{label}</span>
    </li>
  );
}

export function ChatThread({ brief, messages, turn, playback }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLLIElement>(null);
  const lastAssistantId = messages.filter((m) => m.role === 'assistant').at(-1)?.id;
  const isSubmitted = brief.status === 'submitted';
  const showPending = !playback && turn.pending !== null && turn.status !== 'done';
  const lastText = messages.at(-1)?.text.length ?? 0;
  const follow = playback?.follow;
  const searching = Boolean(playback) && messages.at(-1)?.widget?.kind === 'library-search';

  // Follow the conversation only if the user is already near the bottom (AI_NATIVE §4.2).
  // A playing story always follows. The library search holds the middle of the screen.
  useEffect(() => {
    if (follow && searching) {
      searchRef.current?.scrollIntoView({ block: 'center', behavior: follow });
      return;
    }
    if (follow) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: follow });
      return;
    }
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (nearBottom) endRef.current?.scrollIntoView({ block: 'end' });
  }, [
    messages.length,
    lastText,
    turn.text.length,
    turn.status,
    follow,
    playback?.showTyping,
    searching,
  ]);

  return (
    <section className={styles.root} aria-label="Conversation">
      <ol className={styles.list}>
        {messages.length === 0 && showPending ? <DayDivider label="Today" /> : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const label = dayLabel(message.createdAt);
          const divider =
            !previous || dayLabel(previous.createdAt) !== label ? (
              <DayDivider key={`day-${message.id}`} label={label} />
            ) : null;
          if (message.role === 'user') {
            return [
              divider,
              <li
                key={message.id}
                className={playback ? `${styles.userRow} ${styles.enterUser}` : styles.userRow}
              >
                <p className={styles.userBubble}>
                  <span className={styles.srOnly}>You said: </span>
                  {message.text}
                </p>
              </li>,
            ];
          }
          const isLatest = message.id === lastAssistantId;
          const isStreaming = playback?.streamingId === message.id;
          const kind = message.widget?.kind;
          const showWidget =
            isLatest ||
            kind === 'done' ||
            kind === 'library-report' ||
            kind === 'library-search' ||
            kind === 'report-artifact' ||
            kind === 'custom-request';
          const isSearchStage = searching && message.id === messages.at(-1)?.id;
          return [
            divider,
            <li
              key={message.id}
              ref={isSearchStage ? searchRef : undefined}
              className={[
                styles.assistantRow,
                playback ? styles.enterAssistant : '',
                isSearchStage ? styles.searchStage : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isStreaming ? (
                <StreamingText text={message.text} isStreaming />
              ) : (
                <p className={styles.text}>{message.text}</p>
              )}
              {showWidget ? (
                <div className={playback ? `${styles.widget} ${styles.enterCard}` : styles.widget}>
                  <WidgetView
                    message={message}
                    brief={brief}
                    isInteractive={isLatest && !showPending && !isSubmitted}
                    craft={Boolean(playback)}
                    turn={turn}
                  />
                </div>
              ) : null}
              <AssistantFooter
                at={message.createdAt}
                {...(isLatest && !showPending && !isStreaming ? { messageId: message.id } : {})}
              />
            </li>,
          ];
        })}

        {playback?.showTyping ? (
          <li className={styles.typingRow}>
            <span className={styles.srOnly} role="status">
              Assistant is writing
            </span>
            <span className={styles.typing} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
          </li>
        ) : null}

        {showPending && turn.pending?.userText ? (
          <li className={styles.userRow}>
            <p className={styles.userBubble}>
              <span className={styles.srOnly}>You said: </span>
              {turn.pending.userText}
            </p>
          </li>
        ) : null}

        {showPending ? (
          <li className={styles.assistantRow} aria-busy={turn.status === 'streaming'}>
            <AIStepIndicator
              steps={turn.steps}
              isActive={turn.status === 'streaming' && !turn.text}
            />
            {turn.text ? (
              <StreamingText text={turn.text} isStreaming={turn.status === 'streaming'} />
            ) : null}
            {turn.status === 'streaming' ? (
              <div>
                <Button kind="ghost" size="sm" renderIcon={StopFilledAlt} onClick={turn.stop}>
                  Stop
                </Button>
              </div>
            ) : null}
            {turn.status === 'stopped' ? (
              <div className={styles.actions}>
                <p className={styles.notice}>Response stopped.</p>
                <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={turn.retry}>
                  Regenerate
                </Button>
                <Button kind="ghost" size="sm" onClick={turn.dismiss}>
                  Answer differently
                </Button>
              </div>
            ) : null}
            {turn.status === 'error' ? (
              <div className={styles.actions}>
                <ErrorState
                  title="Reply interrupted"
                  message={turn.errorMessage ?? 'Something went wrong. Try again.'}
                  onRetry={turn.retry}
                />
                <Button kind="ghost" size="sm" onClick={turn.dismiss}>
                  Answer differently
                </Button>
              </div>
            ) : null}
          </li>
        ) : null}
      </ol>
      <div ref={endRef} />
    </section>
  );
}
