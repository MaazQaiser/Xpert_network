'use client';

import type { ReactNode } from 'react';
import { Column, Grid } from '@carbon/react';
import styles from './AuthFrame.module.scss';

type AuthFrameProps = { title: string; description?: string; children: ReactNode };

/** Narrow single-column frame for log-in, sign-up and role select. */
export function AuthFrame({ title, description, children }: AuthFrameProps) {
  return (
    <Grid className={styles.root}>
      <Column sm={4} md={{ span: 6, offset: 1 }} lg={{ span: 6, offset: 5 }}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        <div className={styles.body}>{children}</div>
      </Column>
    </Grid>
  );
}
