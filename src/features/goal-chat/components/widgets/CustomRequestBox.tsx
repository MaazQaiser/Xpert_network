'use client';

import Link from 'next/link';
import { Button } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import styles from './widgets.module.scss';

type CustomRequestBoxProps = {
  requestId: string;
  gap: string;
};

/** Closing box: the library stopped short, and custom research is the next step. */
export function CustomRequestBox({ requestId, gap }: CustomRequestBoxProps) {
  return (
    <div className={styles.storyCard}>
      <span className={styles.label}>For more depth</span>
      <p className={styles.sectionTitle}>Request custom research</p>
      <p className={styles.muted}>{gap}</p>
      <Button as={Link} href={routes.client.request(requestId)}>
        Request custom research
      </Button>
    </div>
  );
}
