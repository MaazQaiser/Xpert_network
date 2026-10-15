import { z } from 'zod';

export const STEP_IDS = [
  'goal',
  'subject',
  'questions',
  'constraints',
  'summary',
  'options',
  'checkout',
] as const;

export const stepIdSchema = z.enum(STEP_IDS);
export type StepId = z.infer<typeof stepIdSchema>;

export const stepStatusSchema = z.enum(['todo', 'active', 'done', 'attention']);
export type StepStatus = z.infer<typeof stepStatusSchema>;

export const STEP_LABELS: Record<StepId, { label: string; hint: string }> = {
  goal: { label: 'Goal', hint: 'The decision you are making' },
  subject: { label: 'Subject', hint: 'Company, industry, region, time frame' },
  questions: { label: 'Questions', hint: 'What you need to know' },
  constraints: { label: 'Constraints', hint: 'Deadline, budget, depth' },
  summary: { label: 'Needs summary', hint: 'Confirm your research brief' },
  options: { label: 'Options', hint: 'Library, custom research or both' },
  checkout: { label: 'Checkout', hint: 'Buy or request a quote' },
};

export const STATUS_TEXT: Record<StepStatus, string> = {
  todo: 'Not started',
  active: 'In progress',
  done: 'Complete',
  attention: 'Needs attention',
};

/** Steps 1–4 gather the brief; revisiting one of them returns to the summary afterwards. */
export const GATHERING_STEPS: readonly StepId[] = ['goal', 'subject', 'questions', 'constraints'];

export function stepIndex(step: StepId): number {
  return STEP_IDS.indexOf(step);
}

export function initialStepStatus(): Record<StepId, StepStatus> {
  return {
    goal: 'active',
    subject: 'todo',
    questions: 'todo',
    constraints: 'todo',
    summary: 'todo',
    options: 'todo',
    checkout: 'todo',
  };
}

/** Share of steps that are complete (or complete-with-attention), 0–100. */
export function progressPercent(status: Record<StepId, StepStatus>): number {
  const finished = STEP_IDS.filter((id) => status[id] === 'done' || status[id] === 'attention');
  return Math.round((finished.length / STEP_IDS.length) * 100);
}

/** A step can be reopened when it's finished and the brief hasn't been submitted. */
export function canRevisit(step: StepId, status: Record<StepId, StepStatus>, isSubmitted: boolean) {
  if (isSubmitted) return false;
  if (!GATHERING_STEPS.includes(step) && step !== 'summary' && step !== 'options') return false;
  return status[step] === 'done' || status[step] === 'attention';
}
