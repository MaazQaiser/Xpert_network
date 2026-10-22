'use client';

import type { ReactNode } from 'react';
import styles from './AuthFrame.module.scss';

type AuthFrameProps = { title: string; description?: string; children: ReactNode };

/** Narrow single-column frame for log-in, sign-up and role select, centred on the screen. */
export function AuthFrame({ title, description, children }: AuthFrameProps) {
  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
