import { describe, expect, it } from 'vitest';
import { canRevisit, initialStepStatus, progressPercent } from './steps';

describe('steps', () => {
  it('starts with the goal step active and nothing complete', () => {
    const status = initialStepStatus();
    expect(status.goal).toBe('active');
    expect(progressPercent(status)).toBe(0);
  });

  it('counts complete and needs-attention steps towards progress', () => {
    const status = { ...initialStepStatus(), goal: 'done' as const, subject: 'attention' as const };
    expect(progressPercent(status)).toBe(29);
  });

  it('lets completed steps be revisited until the brief is submitted', () => {
    const status = { ...initialStepStatus(), goal: 'done' as const };
    expect(canRevisit('goal', status, false)).toBe(true);
    expect(canRevisit('goal', status, true)).toBe(false);
    expect(canRevisit('subject', status, false)).toBe(false);
    expect(canRevisit('checkout', { ...status, checkout: 'done' }, false)).toBe(false);
  });
});
