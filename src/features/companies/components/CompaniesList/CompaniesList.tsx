'use client';

import Link from 'next/link';
import { SkeletonPlaceholder } from '@carbon/react';
import { ChevronRight } from '@carbon/icons-react';
import { Enterprise } from '@carbon/pictograms-react';
import { useSubjects } from '@/features/goal-chat';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState, PageHeader } from '@/shared/ui';
import styles from './CompaniesList.module.scss';

/** Catalogue of companies a client can research. Each card opens the library search for that name. */
export function CompaniesList() {
  const subjects = useSubjects();

  return (
    <div className={styles.root}>
      <PageHeader
        title="Companies"
        subtitle="Companies in the research catalogue. Open one to see the library reports that cover it."
      />
      <AsyncBoundary
        query={subjects}
        errorTitle="Companies didn’t load"
        loading={
          <div className={styles.list} aria-busy="true" aria-label="Loading companies">
            {[0, 1, 2].map((item) => (
              <SkeletonPlaceholder key={item} className={styles.skeleton} />
            ))}
          </div>
        }
        isEmpty={(data) => data.every((subject) => subject.kind !== 'company')}
        empty={
          <EmptyState
            pictogram={<Enterprise aria-hidden="true" />}
            title="No companies yet"
            description="The catalogue doesn’t list any companies to research."
          />
        }
      >
        {(data) => (
          <ul className={styles.list}>
            {data
              .filter((subject) => subject.kind === 'company')
              .map((company) => (
                <li key={company.id}>
                  <Link
                    href={`${routes.client.library}?q=${encodeURIComponent(company.label)}`}
                    className={styles.card}
                  >
                    <span className={styles.text}>
                      <span className={styles.title}>{company.label}</span>
                      <span className={styles.detail}>{company.detail}</span>
                    </span>
                    <ChevronRight className={styles.chevron} aria-hidden={true} />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
