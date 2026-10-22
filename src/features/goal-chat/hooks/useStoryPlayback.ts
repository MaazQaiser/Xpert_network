'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../model/message.schema';

export type StoryPlaybackStatus = 'ready' | 'playing' | 'paused' | 'done';

const USER_HOLD = 1100;
const TYPING_HOLD = 700;
const WORD_GAP = 48;
const CARD_HOLD = 950;
const BETWEEN = 450;
const REDUCED_HOLD = 140;

type Draft = {
  message: ChatMessage;
  text: string;
  showWidget: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Plays a seeded brief one message at a time: the user line arrives, the assistant
 * types, then a card eases in. Pause keeps what is already on screen.
 */
export function useStoryPlayback(script: ChatMessage[], autostart = false) {
  const scriptRef = useRef(script);
  const indexRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const reducedRef = useRef(false);
  const autostartRef = useRef(autostart);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState<StoryPlaybackStatus>(autostart ? 'playing' : 'ready');
  const [shown, setShown] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  useEffect(() => {
    const sync = () => {
      const next = prefersReducedMotion();
      reducedRef.current = next;
      setReduced(next);
    };
    sync();
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    query?.addEventListener('change', sync);
    return () => query?.removeEventListener('change', sync);
  }, []);

  const run = useCallback(async (signal: AbortSignal) => {
    const hold = () => (reducedRef.current ? REDUCED_HOLD : null);
    try {
      const lines = scriptRef.current;
      for (let i = indexRef.current; i < lines.length; i += 1) {
        const message = lines[i];
        if (!message || signal.aborted) return;
        if (message.role === 'user') {
          indexRef.current = i + 1;
          setShown((prev) => [...prev, message]);
          await wait(hold() ?? USER_HOLD, signal);
          continue;
        }
        setTyping(true);
        await wait(hold() ?? TYPING_HOLD, signal);
        setTyping(false);
        if (reducedRef.current) {
          setDraft({ message, text: message.text, showWidget: false });
        } else {
          const parts = message.text.split(/(\s+)/).filter((part) => part.length > 0);
          let built = '';
          for (const part of parts) {
            built += part;
            setDraft({ message, text: built, showWidget: false });
            if (part.trim()) await wait(WORD_GAP, signal);
          }
        }
        if (message.widget) {
          const holdFor =
            message.widget.kind === 'library-search'
              ? 2800
              : message.widget.kind === 'report-artifact'
                ? 1800
                : CARD_HOLD;
          setDraft({ message, text: message.text, showWidget: true });
          await wait(hold() ?? holdFor, signal);
        }
        setDraft(null);
        indexRef.current = i + 1;
        setShown((prev) => [...prev, message]);
        await wait(hold() ?? BETWEEN, signal);
      }
      if (!signal.aborted) setStatus('done');
    } catch (error) {
      if (!isAbort(error)) throw error;
    }
  }, []);

  useEffect(() => {
    if (!autostartRef.current || scriptRef.current.length === 0) return;
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      const controller = new AbortController();
      abortRef.current = controller;
      void run(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (started) abortRef.current?.abort();
    };
  }, [run]);

  const start = useCallback(() => {
    if (scriptRef.current.length === 0) return;
    if (indexRef.current >= scriptRef.current.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('playing');
    void run(controller.signal);
  }, [run]);

  const pause = useCallback(() => {
    abortRef.current?.abort();
    setTyping(false);
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }, []);

  const replay = useCallback(() => {
    abortRef.current?.abort();
    indexRef.current = 0;
    setShown([]);
    setDraft(null);
    setTyping(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('playing');
    void run(controller.signal);
  }, [run]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    indexRef.current = 0;
    setShown([]);
    setDraft(null);
    setTyping(false);
    setStatus('ready');
  }, []);

  const visible = useMemo(() => {
    if (!draft) return shown;
    return [
      ...shown,
      {
        ...draft.message,
        text: draft.text,
        widget: draft.showWidget ? draft.message.widget : null,
      },
    ];
  }, [draft, shown]);

  const position = Math.min(script.length, shown.length + (draft || typing ? 1 : 0));

  return {
    status,
    visible,
    position,
    typing,
    streamingId: draft && !draft.showWidget ? draft.message.id : null,
    reduced,
    play: start,
    pause,
    replay,
    reset,
  };
}
