import { describe, expect, it } from 'vitest';
import type { ResearchBrief, TurnAction } from '@/features/goal-chat';
import { LIBRARY_ITEMS } from '../../fixtures/library';
import { ALL_SUBJECTS } from '../../fixtures/entities';
import { USERS } from '../../fixtures/users';
import { computeCoverage } from './coverage';
import { runTurn, TurnRejected, type EngineContext } from './engine';
import { makeBrief } from './fixtures.test-utils';

const ctx: EngineContext = {
  user: USERS.bilal,
  now: new Date('2026-10-15T09:00:00.000Z'),
  getCoverage: (brief) =>
    computeCoverage(brief, { library: LIBRARY_ITEMS, ownedReportIds: [], scenario: 'auto' }),
  lastWidget: null,
};

const subject = (id: string) => {
  const found = ALL_SUBJECTS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown subject ${id}`);
  return found;
};

function play(actions: TurnAction[], start: ResearchBrief = makeBrief()) {
  return actions.reduce((brief, action) => runTurn(brief, action, ctx).brief, start);
}

describe('goal chat engine', () => {
  it('opens by greeting the user and offering goal types', () => {
    const result = runTurn(makeBrief(), { kind: 'start' }, ctx);
    expect(result.reply).toMatch(/^Hi Bilal/);
    expect(result.widget).toEqual({
      kind: 'goal-types',
      options: ['invest', 'expand', 'market', 'other'],
    });
  });

  it('skips the goal-type question when onboarding already chose one (F1 deep link)', () => {
    const result = runTurn(makeBrief(), { kind: 'start', goalType: 'expand' }, ctx);
    expect(result.brief.goalType).toBe('expand');
    expect(result.userText).toBe('Expand to a new region');
    expect(result.reply).toMatch(/^Hi Bilal/);
    expect(result.widget?.kind).not.toBe('goal-types');
  });

  it('completes the goal step once there is a goal type and a one-line objective', () => {
    const brief = play([{ kind: 'goal-type', goalType: 'expand' }]);
    expect(brief.stepStatus.goal).toBe('active');
    const next = runTurn(
      brief,
      { kind: 'text', text: 'Decide whether to open 3 cafés in Riyadh' },
      ctx,
    );
    expect(next.brief.stepStatus.goal).toBe('done');
    expect(next.brief.currentStep).toBe('subject');
  });

  it('asks for more detail when the objective is too short', () => {
    const brief = play([{ kind: 'goal-type', goalType: 'expand' }]);
    const next = runTurn(brief, { kind: 'text', text: 'Riyadh cafés' }, ctx);
    expect(next.brief.currentStep).toBe('goal');
    expect(next.reply).toMatch(/say a little more/);
  });

  it('steers off-topic messages back to the current step', () => {
    const result = runTurn(makeBrief(), { kind: 'text', text: 'Tell me a joke' }, ctx);
    expect(result.reply).toMatch(/continue with goal/);
    expect(result.brief.currentStep).toBe('goal');
  });

  it('won’t leave the subject step without a subject', () => {
    const brief = play([
      { kind: 'goal-type', goalType: 'expand' },
      { kind: 'text', text: 'Decide whether to open 3 cafés in Riyadh' },
      { kind: 'subjects-done' },
    ]);
    expect(brief.currentStep).toBe('subject');
    expect(brief.stepStatus.subject).toBe('attention');
  });

  it('suggests questions templated with the brief’s subjects', () => {
    const brief = play([
      { kind: 'goal-type', goalType: 'expand' },
      { kind: 'text', text: 'Decide whether to open 3 cafés in Riyadh' },
      { kind: 'subject-add', subject: subject('rg_riyadh') },
    ]);
    const result = runTurn(brief, { kind: 'subjects-done' }, ctx);
    expect(result.widget?.kind).toBe('questions');
    if (result.widget?.kind !== 'questions') return;
    expect(result.widget.suggestions[0]?.text).toContain('Riyadh');
  });

  it('rejects fewer than 3 questions and deadlines under 3 days away', () => {
    const brief = makeBrief({ currentStep: 'questions', goalType: 'expand' });
    const two = [
      { id: 'a', text: 'Question one?', topic: 'rent', source: 'ai' as const },
      { id: 'b', text: 'Question two?', topic: 'rent', source: 'ai' as const },
    ];
    expect(() => runTurn(brief, { kind: 'questions', questions: two }, ctx)).toThrow(TurnRejected);
    expect(() =>
      runTurn(
        brief,
        {
          kind: 'constraints',
          constraints: { deadline: '2026-10-16', budgetCredits: 400, depth: 'standard' },
        },
        ctx,
      ),
    ).toThrow(/at least 3 days/);
  });

  it('walks the happy path to the options step with a coverage map', () => {
    const questions = [
      {
        id: 'q1',
        text: 'Who supplies cafés in Riyadh?',
        topic: 'suppliers',
        source: 'ai' as const,
      },
      { id: 'q2', text: 'What rent should I expect?', topic: 'rent', source: 'ai' as const },
      { id: 'q3', text: 'Which licences are needed?', topic: 'licensing', source: 'ai' as const },
    ];
    const brief = play([
      { kind: 'start' },
      { kind: 'goal-type', goalType: 'expand' },
      { kind: 'text', text: 'Decide whether to open 3 cafés in Riyadh' },
      { kind: 'subject-add', subject: subject('rg_riyadh') },
      { kind: 'subjects-done' },
      { kind: 'questions', questions },
      {
        kind: 'constraints',
        constraints: { deadline: '2026-11-05', budgetCredits: 400, depth: 'standard' },
      },
    ]);
    expect(brief.currentStep).toBe('summary');
    expect(brief.aiSnapshot?.questions).toHaveLength(3);

    const confirmed = runTurn(brief, { kind: 'confirm-needs' }, ctx);
    expect(confirmed.brief.status).toBe('confirmed');
    expect(confirmed.brief.currentStep).toBe('options');
    expect(confirmed.steps).toContain('Searching the library');
    expect(confirmed.widget?.kind).toBe('options');
  });

  it('returns to the summary after revisiting an earlier step', () => {
    const brief = makeBrief({
      goalType: 'expand',
      objective: 'Decide whether to open 3 cafés in Riyadh',
      subjects: [subject('rg_riyadh')],
      currentStep: 'summary',
      stepStatus: {
        goal: 'done',
        subject: 'done',
        questions: 'done',
        constraints: 'done',
        summary: 'active',
        options: 'todo',
        checkout: 'todo',
      },
    });
    const reopened = runTurn(brief, { kind: 'revisit', step: 'subject' }, ctx);
    expect(reopened.brief.currentStep).toBe('subject');
    const after = runTurn(
      reopened.brief,
      { kind: 'subject-add', subject: subject('in_specialty_coffee') },
      ctx,
    );
    const done = runTurn(after.brief, { kind: 'subjects-done' }, ctx);
    expect(done.brief.currentStep).toBe('summary');
    expect(done.widget).toEqual({ kind: 'summary' });
  });
});
