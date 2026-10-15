'use client';

import Link from 'next/link';
import { Button } from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { Magnify } from '@carbon/pictograms-react';
import styles from './NotFoundState.module.scss';

export type NotFoundStateProps = {
  /** Becomes the page's h1, e.g. “We couldn’t find that request”. */
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
};

/** A missing record (404): say so and point back to the list; retrying wouldn't help. */
export function NotFoundState({ title, message, backHref, backLabel }: NotFoundStateProps) {
  return (
    <div className={styles.root}>
      <Magnify aria-hidden="true" className={styles.pictogram} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <Button as={Link} href={backHref} kind="tertiary" renderIcon={ArrowLeft}>
        {backLabel}
      </Button>
    </div>
  );
}
