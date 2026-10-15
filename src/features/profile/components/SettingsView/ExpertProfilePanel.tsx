'use client';

import { SkeletonText } from '@carbon/react';
import { ExpertProfileSummary, useExpertOnboarding } from '@/features/onboarding';
import { AsyncBoundary } from '@/shared/ui';
import styles from './Settings.module.scss';

/** The vetted expert profile, read-only once approved (F7 → F17). */
export function ExpertProfilePanel() {
  const profile = useExpertOnboarding();
  return (
    <section className={styles.section} aria-labelledby="expert-profile-heading">
      <div>
        <h2 id="expert-profile-heading" className={styles.sectionTitle}>
          Your expert profile
        </h2>
        <p className={styles.help}>
          Clients see your headline, years of experience and regions — never your name. To change
          your expertise or conflicts, email experts@proptyop.example; changes are re-reviewed.
        </p>
      </div>
      <AsyncBoundary
        query={profile}
        errorTitle="Couldn’t load your expert profile"
        loading={<SkeletonText paragraph lineCount={8} />}
      >
        {(data) => <ExpertProfileSummary profile={data} headingLevel={3} />}
      </AsyncBoundary>
    </section>
  );
}
