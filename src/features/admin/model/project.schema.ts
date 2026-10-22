import { z } from 'zod';

/** PRD "Data model and statuses": eight in order, two side states, archived from any. */
export const projectStatusSchema = z.enum([
  'draft',
  'matching',
  'shortlisted',
  'pitching',
  'scheduling',
  'waiting_on_client',
  'booked',
  'completed',
  'outreach',
  'needs_client_info',
  'archived',
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  matching: 'Matching',
  shortlisted: 'Shortlisted',
  pitching: 'Pitching',
  scheduling: 'Scheduling',
  waiting_on_client: 'Waiting on client',
  booked: 'Booked',
  completed: 'Completed',
  outreach: 'Outreach',
  needs_client_info: 'Needs client info',
  archived: 'Archived',
};

/** The steps trail on every project screen (wireframes 04–05). */
export const PROJECT_STEPS = ['Brief', 'Match', 'Shortlist', 'Availability', 'Booking', 'Call'];

export function projectStepIndex(status: ProjectStatus): number {
  switch (status) {
    case 'draft':
    case 'needs_client_info':
      return 0;
    case 'matching':
    case 'outreach':
      return 1;
    case 'shortlisted':
    case 'pitching':
      return 2;
    case 'scheduling':
    case 'waiting_on_client':
      return 3;
    case 'booked':
      return 4;
    case 'completed':
    case 'archived':
      return 5;
  }
}

export const keyFactSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Null when the document doesn't say. */
  value: z.string().nullable(),
  state: z.enum(['ok', 'confirm', 'missing']),
  page: z.number().int().positive().nullable(),
});
export type KeyFact = z.infer<typeof keyFactSchema>;

export const requirementSchema = z.object({ id: z.string(), text: z.string() });
export type Requirement = z.infer<typeof requirementSchema>;

export const clientQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  page: z.number().int().positive().nullable(),
});
export type ClientQuestion = z.infer<typeof clientQuestionSchema>;

export const confirmationSchema = z.object({
  id: z.string(),
  factId: z.string(),
  text: z.string(),
  /** What the AI would assume if the PM confirms, e.g. "2 Nov". Null means ask the client. */
  proposal: z.string().nullable(),
  state: z.enum(['open', 'confirmed', 'asked']),
});
export type Confirmation = z.infer<typeof confirmationSchema>;

export const activitySchema = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.enum(['ai', 'pm', 'system']),
  text: z.string(),
});
export type Activity = z.infer<typeof activitySchema>;

export const sourceBlockSchema = z.object({
  id: z.string(),
  kind: z.enum(['heading', 'text']),
  text: z.string(),
  /** The brief item this passage is the source of (question or fact id). */
  sourceFor: z.string().nullable(),
});

export const sourcePageSchema = z.object({
  page: z.number().int().positive(),
  blocks: z.array(sourceBlockSchema),
});
export type SourcePage = z.infer<typeof sourcePageSchema>;

const draftContentSchema = z.object({
  brief: z.string(),
  requirements: z.array(requirementSchema),
  questions: z.array(clientQuestionSchema),
});
export type DraftContent = z.infer<typeof draftContentSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: projectStatusSchema,
  client: z.object({ id: z.string(), name: z.string() }),
  contact: z.object({ name: z.string(), email: z.string() }),
  owner: z.string(),
  source: z.object({
    requestId: z.string().nullable(),
    fileName: z.string().nullable(),
  }),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  version: z.string(),
  ...draftContentSchema.shape,
  /** What the AI drafted, so every edit can be reset to the AI's pick. */
  ai: draftContentSchema,
  briefLength: z.enum(['standard', 'shorter']),
  facts: z.array(keyFactSchema),
  confirmations: z.array(confirmationSchema),
  activity: z.array(activitySchema),
  document: z.object({ pageCount: z.number().int().positive(), pages: z.array(sourcePageSchema) }),
  /** Expert answers waiting for the PM (home summary). */
  pendingExpertReviews: z.number().int().min(0),
});
export type Project = z.infer<typeof projectSchema>;

export const projectSummarySchema = projectSchema.pick({
  id: true,
  name: true,
  status: true,
  client: true,
  owner: true,
  createdAt: true,
  pendingExpertReviews: true,
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectPatchSchema = z
  .object({
    brief: z.string().trim().min(20, 'Write at least a sentence for the brief.').max(1500),
    requirements: z.array(requirementSchema).max(20),
    questions: z
      .array(clientQuestionSchema.extend({ text: z.string().trim().min(5).max(300) }))
      .max(20),
  })
  .partial();
export type ProjectPatch = z.infer<typeof projectPatchSchema>;

export const questionTextSchema = z
  .string()
  .trim()
  .min(5, 'Write the question in a few words.')
  .max(300, 'Keep it under 300 characters.');

export const requirementTextSchema = z
  .string()
  .trim()
  .min(2, 'Write the requirement.')
  .max(80, 'Keep it under 80 characters.');

export const clarificationSchema = z.object({
  to: z.string(),
  subject: z.string().trim().min(3, 'Add a subject.').max(150),
  body: z.string().trim().min(20, 'Write the message.').max(3000),
});
export type Clarification = z.infer<typeof clarificationSchema>;

export function isEdited(project: Pick<Project, 'ai' | 'brief' | 'requirements' | 'questions'>) {
  return {
    brief: project.brief !== project.ai.brief,
    requirements: JSON.stringify(project.requirements) !== JSON.stringify(project.ai.requirements),
    questions: JSON.stringify(project.questions) !== JSON.stringify(project.ai.questions),
  };
}

export function openConfirmations(project: Pick<Project, 'confirmations'>): Confirmation[] {
  return project.confirmations.filter((c) => c.state === 'open');
}
