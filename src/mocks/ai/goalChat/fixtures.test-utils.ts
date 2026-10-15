import { initialStepStatus, type ResearchBrief } from '@/features/goal-chat';

export function makeBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    id: 'brf_test',
    ownerId: 'usr_bilal',
    title: 'Untitled brief',
    goalType: null,
    objective: null,
    subjects: [],
    questions: [],
    constraints: { deadline: null, budgetCredits: null, depth: null },
    status: 'draft',
    currentStep: 'goal',
    stepStatus: initialStepStatus(),
    chosenOption: null,
    aiSnapshot: null,
    isEditedByUser: false,
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    ...overrides,
  };
}
