'use client';

import Link from 'next/link';
import { Button, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { PageHeader } from '@/shared/ui';
import { routes } from '@/shared/config/routes';
import { ResumeBriefs } from '../ResumeBriefs/ResumeBriefs';
import styles from './ClientHome.module.scss';

/** Client home: start a goal, resume drafts. */
export function ClientHome() {
  const session = useSession();
  const firstName = session.data?.user?.name.split(' ')[0];
  return (
    <div className={styles.root}>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        subtitle="What decision are you working on?"
      />
      <Tile className={styles.hero}>
        <h2 className={styles.heroTitle}>Start with your goal</h2>
        <p className={styles.heroBody}>
          Answer a few guided questions. We’ll draft a research brief, show which questions the
          library already answers, and quote anything it doesn’t.
        </p>
        <Button as={Link} href={routes.client.ask} renderIcon={ArrowRight}>
          Describe a goal
        </Button>
      </Tile>
      <ResumeBriefs />
    </div>
  );
}
