'use client';

import Link from 'next/link';
import { Button, SkeletonText, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, PageHeader, StatusTag } from '@/shared/ui';
import { useExpertOnboarding } from '../../api/queries';
import { ExpertProfileSummary } from '../ExpertProfileSummary/ExpertProfileSummary';
import styles from './ExpertHome.module.scss';

/** Expert home once approved (F7 outcome): next steps + the expertise calls are matched on. */
export function ExpertHome() {
  const session = useSession();
  const profile = useExpertOnboarding();
  const firstName = session.data?.user?.name.split(' ')[0];

  return (
    <div className={styles.root}>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : 'Welcome'}
        subtitle="Give interviews on topics you know and get paid for each accepted one."
        actions={<StatusTag tone="success" label="Approved expert" />}
      />
      <Tile className={styles.hero}>
        <h2 className={styles.heroTitle}>Find your next interview</h2>
        <p className={styles.heroBody}>
          Open calls are matched to your topics and regions. Strong matches are listed first.
        </p>
        <Button as={Link} href={routes.expert.calls} renderIcon={ArrowRight}>
          Browse open calls
        </Button>
      </Tile>
      <section aria-labelledby="expertise-heading" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 id="expertise-heading" className={styles.heroTitle}>
            Your expertise
          </h2>
          <Link href={routes.expert.profile}>View your profile</Link>
        </div>
        <AsyncBoundary
          query={profile}
          errorTitle="Couldn’t load your expertise"
          loading={<SkeletonText paragraph lineCount={4} />}
        >
          {(data) => (
            <>
              {data.decidedAt ? (
                <p className={styles.meta}>Approved {formatDate(data.decidedAt)}</p>
              ) : null}
              <ExpertProfileSummary profile={data} sections={['expertise']} />
            </>
          )}
        </AsyncBoundary>
      </section>
    </div>
  );
}
