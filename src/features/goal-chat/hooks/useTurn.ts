'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAIStream } from '@/shared/ai';
import { createId } from '@/shared/lib/id';
import { briefKeys } from '../api/keys';
import {
  turnResultSchema,
  type Conversation,
  type TurnAction,
  type TurnResult,
} from '../model/turn.schema';

/** Text shown in the user's bubble while a turn is in flight. */
export type PendingTurn = { action: TurnAction; userText: string | null; turnId: string };

/**
 * Sends one turn of the goal chat and streams the assistant's reply. On completion the
 * conversation cache is updated in place. Retries reuse the turnId, so they're idempotent.
 */
export function useTurn(briefId: string) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const lastTurn = useRef<PendingTurn | null>(null);

  const onDone = useCallback(
    (result: TurnResult) => {
      queryClient.setQueryData<Conversation>(briefKeys.conversation(briefId), (current) => {
        if (!current) return current;
        const known = new Set(current.messages.map((m) => m.id));
        const added = [result.userMessage, result.assistantMessage].filter(
          (m): m is NonNullable<typeof m> => m !== null && !known.has(m.id),
        );
        return { brief: result.brief, messages: [...current.messages, ...added] };
      });
      void queryClient.invalidateQueries({ queryKey: briefKeys.list() });
      setPending(null);
    },
    [briefId, queryClient],
  );

  const stream = useAIStream({
    path: `/briefs/${briefId}/turns`,
    resultSchema: turnResultSchema,
    onDone,
  });

  const run = useCallback(
    (turn: PendingTurn) => {
      lastTurn.current = turn;
      setPending(turn);
      void stream.start({ turnId: turn.turnId, action: turn.action });
    },
    [stream],
  );

  const send = useCallback(
    (action: TurnAction, userText: string | null = null) => {
      if (stream.status === 'streaming') return;
      run({ action, userText, turnId: createId('turn') });
    },
    [run, stream.status],
  );

  /** Retry or regenerate the last turn with the same input (error, Stop). */
  const retry = useCallback(() => {
    if (lastTurn.current) run(lastTurn.current);
  }, [run]);

  /** Drop a failed/stopped turn so the user can answer differently. */
  const dismiss = useCallback(() => {
    setPending(null);
    stream.reset();
  }, [stream]);

  return {
    pending,
    status: stream.status,
    text: stream.text,
    steps: stream.steps,
    errorMessage: stream.errorMessage,
    isBusy: stream.status === 'streaming',
    send,
    stop: stream.stop,
    retry,
    dismiss,
  };
}

export type TurnController = ReturnType<typeof useTurn>;
