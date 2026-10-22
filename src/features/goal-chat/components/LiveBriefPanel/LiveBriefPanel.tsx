'use client';

import type { ComponentType } from 'react';
import { Button, Tag } from '@carbon/react';
import {
  CheckmarkFilled,
  CircleDash,
  Edit,
  Incomplete,
  WarningAltFilled,
} from '@carbon/icons-react';
import { formatDate } from '@/shared/lib/dates';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { DEPTH_LABELS, GOAL_TYPE_LABELS, type ResearchBrief } from '../../model/brief.schema';
import {
  STATUS_TEXT,
  STEP_IDS,
  STEP_LABELS,
  canRevisit,
  type StepId,
  type StepStatus,
} from '../../model/steps';
import styles from './LiveBriefPanel.module.scss';

const NOT_SET = 'Not set yet';

const OPTION_LABELS = {
  library: 'Buy library reports',
  custom: 'Request custom research',
  mix: 'Reports now, custom research for the gaps',
} as const;

const STATUS_ICON: Record<
  StepStatus,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  done: CheckmarkFilled,
  active: Incomplete,
  attention: WarningAltFilled,
  todo: CircleDash,
};

function StepValue({ brief, step }: { brief: ResearchBrief; step: StepId }) {
  const { constraints } = brief;
  switch (step) {
    case 'goal':
      return brief.goalType || brief.objective ? (
        <>
          {brief.goalType ? (
            <span className={styles.strong}>{GOAL_TYPE_LABELS[brief.goalType]}</span>
          ) : null}
          {brief.objective ? <span>{brief.objective}</span> : null}
        </>
      ) : (
        <>{NOT_SET}</>
      );
    case 'subject':
      return brief.subjects.length ? (
        <span className={styles.tags}>
          {brief.subjects.map((subject) => (
            <Tag key={subject.id} size="sm" type="gray">
              {subject.label}
            </Tag>
          ))}
        </span>
      ) : (
        <>{NOT_SET}</>
      );
    case 'questions':
      return brief.questions.length ? (
        <ol className={styles.questions}>
          {brief.questions.map((question) => (
            <li key={question.id}>{question.text}</li>
          ))}
        </ol>
      ) : (
        <>{NOT_SET}</>
      );
    case 'constraints':
      return brief.stepStatus.constraints === 'todo' ? (
        <>{NOT_SET}</>
      ) : (
        <>
          {constraints.deadline ? `By ${formatDate(constraints.deadline)}` : 'No deadline yet'} ·{' '}
          {constraints.budgetCredits !== null
            ? `up to ${formatCreditsWithCurrency(constraints.budgetCredits)}`
            : 'budget not set'}
          {constraints.depth ? ` · ${DEPTH_LABELS[constraints.depth].label}` : ''}
        </>
      );
    case 'summary':
      return (
        <>
          {brief.status !== 'draft'
            ? 'Needs confirmed'
            : brief.stepStatus.summary === 'active'
              ? 'Waiting for you to confirm'
              : NOT_SET}
        </>
      );
    case 'options':
      return <>{brief.chosenOption ? OPTION_LABELS[brief.chosenOption] : NOT_SET}</>;
    case 'checkout':
      return <>{brief.status === 'submitted' ? 'Submitted' : NOT_SET}</>;
  }
}

type LiveBriefPanelProps = {
  brief: ResearchBrief;
  isBusy: boolean;
  onRevisit: (step: StepId) => void;
  /** Seeded story: the checklist stays readable, and Edit does not reopen the stepper. */
  readOnly?: boolean;
};

/**
 * The research brief as a progress checklist: each step's status and answer, filling in as
 * the chat goes. Finished steps can be reopened with Edit (PRODUCT_PLAN F2 behaviour).
 */
export function LiveBriefPanel({
  brief,
  isBusy,
  onRevisit,
  readOnly = false,
}: LiveBriefPanelProps) {
  const isSubmitted = brief.status === 'submitted';
  const doneCount = STEP_IDS.filter(
    (id) => brief.stepStatus[id] === 'done' || brief.stepStatus[id] === 'attention',
  ).length;

  return (
    <aside className={styles.root} aria-labelledby="live-brief-heading">
      <div className={styles.header}>
        <h2 id="live-brief-heading" className={styles.heading}>
          Research brief
        </h2>
        <span className={styles.count}>
          {doneCount} of {STEP_IDS.length} done
        </span>
      </div>
      <p className={styles.hint}>Fills in as you answer. Saved automatically.</p>
      <ol className={styles.steps}>
        {STEP_IDS.map((step) => {
          const status = brief.stepStatus[step];
          const Icon = STATUS_ICON[status];
          const isCurrent = step === brief.currentStep && !isSubmitted;
          const isEditable = !isCurrent && canRevisit(step, brief.stepStatus, isSubmitted);
          return (
            <li
              key={step}
              className={styles.step}
              data-status={status}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <Icon className={styles.icon} aria-hidden />
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <h3 className={styles.title}>{STEP_LABELS[step].label}</h3>
                  <span className={styles.status}>{STATUS_TEXT[status]}</span>
                  {isEditable && !readOnly ? (
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={Edit}
                      iconDescription={`Edit ${STEP_LABELS[step].label.toLowerCase()}`}
                      tooltipPosition="left"
                      disabled={isBusy}
                      onClick={() => onRevisit(step)}
                      className={styles.edit}
                    />
                  ) : null}
                </div>
                <div className={styles.value}>
                  <StepValue brief={brief} step={step} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
