'use client';

import { Loading } from '@carbon/react';
import styles from './PageLoading.module.scss';

type PageLoadingProps = {
  description: string;
  /** Inside the app shell, so the spinner sits in the content area. */
  inShell?: boolean;
};

/** Carbon's loading indicator, centered in the viewport. */
export function PageLoading({ description, inShell = false }: PageLoadingProps) {
  return (
    <div className={inShell ? styles.inShell : styles.root}>
      <Loading description={description} withOverlay={false} />
    </div>
  );
}
