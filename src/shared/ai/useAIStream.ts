'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { streamEvents, toUserMessage } from '../api';
import { aiStreamEventSchema, type AIStreamEvent } from './protocol';

export type AIStreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'stopped';

export type AIStreamState<TResult> = {
  status: AIStreamStatus;
  text: string;
  steps: string[];
  result: TResult | null;
  errorMessage: string | null;
};

type Options<TSchema extends z.ZodType> = {
  path: string;
  resultSchema: TSchema;
  onDone?: (result: z.infer<TSchema>) => void;
};

const INITIAL: AIStreamState<never> = {
  status: 'idle',
  text: '',
  steps: [],
  result: null,
  errorMessage: null,
};

/**
 * Streams an AI response, exposing text, step labels and the final structured result.
 * `stop()` aborts (AI_NATIVE §4.2); the request aborts on unmount.
 */
export function useAIStream<TSchema extends z.ZodType>({
  path,
  resultSchema,
  onDone,
}: Options<TSchema>) {
  type Result = z.infer<TSchema>;
  const [state, setState] = useState<AIStreamState<Result>>(INITIAL);
  const controllerRef = useRef<AbortController | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = useCallback(
    async (body: unknown): Promise<Result | null> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ ...INITIAL, status: 'streaming', steps: [] });

      const schema = aiStreamEventSchema(resultSchema);
      try {
        for await (const raw of streamEvents(path, body, schema, controller.signal)) {
          const event = raw as AIStreamEvent<Result>;
          if (event.type === 'step') {
            setState((s) => ({ ...s, steps: [...s.steps, event.label] }));
          } else if (event.type === 'token') {
            setState((s) => ({ ...s, text: s.text + event.text }));
          } else if (event.type === 'error') {
            setState((s) => ({ ...s, status: 'error', errorMessage: event.message }));
            return null;
          } else {
            const result = event.result;
            setState((s) => ({ ...s, status: 'done', result }));
            onDoneRef.current?.(result);
            return result;
          }
        }
        return null;
      } catch (error) {
        if (controller.signal.aborted) {
          setState((s) => ({ ...s, status: 'stopped' }));
          return null;
        }
        setState((s) => ({ ...s, status: 'error', errorMessage: toUserMessage(error) }));
        return null;
      }
    },
    [path, resultSchema],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);
  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, start, stop, reset };
}
