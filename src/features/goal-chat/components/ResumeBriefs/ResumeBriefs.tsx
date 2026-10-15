'use client';

import Link from 'next/link';
import { Button, ClickableTile, SkeletonText } from '@carbon/react';
import { Add } from '@carbon/icons-react';
import { Conversation } from '@carbon/pictograms-react';
import { AsyncBoundary, EmptyState, StatusTag } from '@/shared/ui';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { useBriefs } from '../../api/queries';
import { STEP_LABELS, progressPercent } from '../../model/steps';
import styles from './ResumeBriefs.module.scss';

/** Home: "Resume where you left off" for draft briefs, plus recent submitted ones. */
export function ResumeBriefs() {
  const briefs = useBriefs();
  return (
    <section aria-labelledby="resume-heading" className={styles.root}>
      <div className={styles.header}>
        <h2 id="resume-heading" className={styles.heading}>
          Your research briefs
        </h2>
        <Button as={Link} href={routes.client.ask} kind="tertiary" size="md" renderIcon={Add}>
          New brief
        </Button>
      </div>
      <AsyncBoundary
        query={briefs}
        loading={<SkeletonText paragraph lineCount={4} />}
        errorTitle="Your briefs didn’t load"
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            headingLevel={3}
            pictogram={<Conversation aria-hidden="true" />}
            title="No briefs yet"
            description="Describe a goal and we’ll turn it into a research brief, then show what the library already answers."
            action={
              <Button as={Link} href={routes.client.ask}>
                Start your first goal
              </Button>
            }
          />
        }
      >
        {(data) => (
          <ul className={styles.list}>
            {data.map((brief) => (
              <li key={brief.id}>
                <ClickableTile href={routes.client.brief(brief.id)} className={styles.tile}>
                  <span className={styles.titleRow}>
                    <span className={styles.title}>
                      {brief.title === 'Untitled brief' ? 'New research brief' : brief.title}
                    </span>
                    <StatusTag
                      size="sm"
                      tone={brief.status === 'submitted' ? 'success' : 'info'}
                      label={brief.status === 'submitted' ? 'Submitted' : 'Draft'}
                    />
                  </span>
                  <span className={styles.meta}>
                    {brief.status === 'submitted'
                      ? 'Complete'
                      : `Resume at ${STEP_LABELS[brief.currentStep].label} · ${progressPercent(brief.stepStatus)}% done`}{' '}
                    ·{' '}
                    <span title={formatDateTime(brief.updatedAt)}>
                      updated {formatRelative(brief.updatedAt)}
                    </span>
                  </span>
                </ClickableTile>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </section>
  );
}
