'use client';

import { Button } from '@carbon/react';
import styles from './status-page.module.scss';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.root}>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.body}>
        This page hit a problem on our side. Your work is saved. Try again, or come back in a moment.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
