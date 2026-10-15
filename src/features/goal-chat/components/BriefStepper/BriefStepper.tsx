'use client';

import { ProgressIndicator, ProgressStep } from '@carbon/react';
import { useBreakpointUp } from '@/shared/hooks/useMediaQuery';
import {
  STATUS_TEXT,
  STEP_IDS,
  STEP_LABELS,
  canRevisit,
  stepIndex,
  type StepId,
} from '../../model/steps';
import type { ResearchBrief } from '../../model/brief.schema';
import styles from './BriefStepper.module.scss';

type BriefStepperProps = {
  brief: ResearchBrief;
  isBusy: boolean;
  onRevisit: (step: StepId) => void;
};

/**
 * Sections with status: not started / in progress / complete / needs attention.
 * Completed steps are clickable to jump back (PRODUCT_PLAN F2 behaviour).
 */
export function BriefStepper({ brief, isBusy, onRevisit }: BriefStepperProps) {
  const isVertical = useBreakpointUp('lg');
  const isSubmitted = brief.status === 'submitted';

  return (
    <nav aria-label="Brief steps" className={styles.root}>
      <ProgressIndicator
        vertical={isVertical}
        currentIndex={stepIndex(brief.currentStep)}
        className={styles.indicator}
        onChange={(index: number) => {
          const step = STEP_IDS[index];
          if (step && !isBusy && canRevisit(step, brief.stepStatus, isSubmitted)) onRevisit(step);
        }}
      >
        {STEP_IDS.map((step) => {
          const status = brief.stepStatus[step];
          return (
            <ProgressStep
              key={step}
              label={STEP_LABELS[step].label}
              secondaryLabel={isVertical ? STATUS_TEXT[status] : undefined}
              description={`${STEP_LABELS[step].label}: ${STATUS_TEXT[status]}. ${STEP_LABELS[step].hint}`}
              complete={status === 'done' || status === 'attention'}
              invalid={status === 'attention'}
              disabled={status === 'todo' && step !== brief.currentStep}
            />
          );
        })}
      </ProgressIndicator>
    </nav>
  );
}
