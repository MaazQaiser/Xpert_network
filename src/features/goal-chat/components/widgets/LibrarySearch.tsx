'use client';

import { useEffect, useState } from 'react';
import { CheckmarkFilled, CircleDash } from '@carbon/icons-react';
import styles from './widgets.module.scss';

type LibrarySearchProps = {
  steps: string[];
  /** While the demo is playing, steps complete one at a time. */
  live: boolean;
};

/** The agent looking through the library, left in the thread as a working card. */
export function LibrarySearch({ steps, live }: LibrarySearchProps) {
  const [done, setDone] = useState(live ? 0 : steps.length);

  useEffect(() => {
    if (!live) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setDone(count);
      if (count >= steps.length) window.clearInterval(timer);
    }, 700);
    return () => window.clearInterval(timer);
  }, [live, steps.length]);

  return (
    <div
      className={styles.storyCard}
      aria-busy={done < steps.length}
      aria-label="Searching the library"
    >
      <span className={styles.label}>Searching the library</span>
      <ol className={styles.searchList}>
        {steps.map((step, index) => {
          const complete = index < done;
          return (
            <li key={step} className={complete ? styles.searchDone : styles.searchPending}>
              {complete ? (
                <CheckmarkFilled size={16} aria-hidden="true" />
              ) : (
                <CircleDash
                  size={16}
                  className={index === done ? styles.searchSpin : undefined}
                  aria-hidden="true"
                />
              )}
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
