'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { EmphasisText, streamLength } from '@/shared/ai';
import styles from './AdminHome.module.scss';

/** One word (or bold phrase) every 65 ms: slow enough to feel written, quick enough to follow. */
const WORD_MS = 65;

// Tests, reduced motion and background tabs (where timers crawl) get the whole answer at once.
function startsComplete(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (typeof window === 'undefined') return false;
  return (
    document.hidden || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

/**
 * An assistant answer arriving like a written reply (ChatGPT / Claude): the sentence streams in
 * word by word, then its cards, canvas and chips rise in under it. Screen readers get the
 * sentence once it's complete, not word by word (AI_NATIVE §7).
 */
export function StreamedAnswer({
  text,
  children,
  pauseMs = 0,
  className,
}: {
  text: string;
  children: ReactNode;
  /** A beat between the sentence and what follows it, e.g. before a table. */
  pauseMs?: number;
  className?: string;
}) {
  const total = streamLength(text);
  const instant = startsComplete();
  const [shown, setShown] = useState(() => (instant ? total : 0));
  const [isPaused, setIsPaused] = useState(!instant && pauseMs > 0);
  const isDone = shown >= total;

  useEffect(() => {
    if (!isDone || !isPaused) return;
    const timer = window.setTimeout(() => setIsPaused(false), document.hidden ? 0 : pauseMs);
    return () => window.clearTimeout(timer);
  }, [isDone, isPaused, pauseMs]);

  useEffect(() => {
    if (isDone) return;
    const timer = window.setTimeout(
      // A tab in the background throttles timers, so finish the sentence there instead.
      () => setShown((count) => (document.hidden ? total : count + 1)),
      WORD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [shown, isDone, total]);

  return (
    <>
      <p className={className} aria-hidden={isDone ? undefined : true}>
        {isDone ? <EmphasisText text={text} /> : <EmphasisText text={text} shown={shown} />}
      </p>
      {isDone && !isPaused ? <div className={styles.rise}>{children}</div> : null}
    </>
  );
}
