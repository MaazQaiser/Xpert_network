'use client';

import { useRouter } from 'next/navigation';
import { ProgressIndicator, ProgressStep } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import { PROJECT_STEPS, projectStepIndex, type ProjectStatus } from '../../model/project.schema';
import styles from './ProjectSteps.module.scss';

/** Steps that have a screen so far; the rest arrive with F14–F16. */
const STEP_ROUTES: Partial<Record<number, 'brief' | 'match' | 'shortlist'>> = {
  0: 'brief',
  1: 'match',
  2: 'shortlist',
};

/**
 * The steps trail on every project screen: Brief › Match › Shortlist › Availability › Booking › Call.
 * Reached steps with a screen link to it; steps not reached yet are disabled.
 */
export function ProjectSteps({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const current = projectStepIndex(status);
  const canOpen = (index: number) => index <= current && STEP_ROUTES[index] !== undefined;

  return (
    <nav aria-label="Project steps" className={styles.root}>
      <ProgressIndicator
        currentIndex={current}
        spaceEqually
        className={styles.indicator}
        onChange={(index: number) => {
          const step = STEP_ROUTES[index];
          if (step && canOpen(index)) router.push(routes.admin.projectStep(projectId, step));
        }}
      >
        {PROJECT_STEPS.map((label, index) => (
          <ProgressStep
            key={label}
            label={label}
            description={`${label}: ${index < current ? 'done' : index === current ? 'current step' : 'not started'}`}
            complete={index < current}
            disabled={index > current}
          />
        ))}
      </ProgressIndicator>
    </nav>
  );
}
