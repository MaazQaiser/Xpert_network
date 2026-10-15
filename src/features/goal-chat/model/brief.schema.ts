import { z } from 'zod';
import { stepIdSchema, stepStatusSchema } from './steps';

export const goalTypeSchema = z.enum(['invest', 'expand', 'market', 'other']);
export type GoalType = z.infer<typeof goalTypeSchema>;

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  invest: 'Invest in a company',
  expand: 'Expand to a new region',
  market: 'Understand a market',
  other: 'Other',
};

export const subjectKindSchema = z.enum(['company', 'region', 'industry', 'timeframe', 'custom']);
export type SubjectKind = z.infer<typeof subjectKindSchema>;

export const subjectSchema = z.object({
  id: z.string(),
  kind: subjectKindSchema,
  label: z.string(),
  /** Short context shown in "Did you mean…" lists, e.g. "Specialty coffee · KSA, UAE". */
  detail: z.string(),
});
export type Subject = z.infer<typeof subjectSchema>;

export const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(5),
  topic: z.string(),
  source: z.enum(['ai', 'user']),
});
export type Question = z.infer<typeof questionSchema>;

export const depthSchema = z.enum(['quick', 'standard', 'deep']);
export type Depth = z.infer<typeof depthSchema>;

export const DEPTH_LABELS: Record<Depth, { label: string; hint: string }> = {
  quick: { label: 'Quick scan', hint: '2–3 experts, headline answers' },
  standard: { label: 'Standard', hint: '4–6 experts, evidence per question' },
  deep: { label: 'Deep dive', hint: '8+ experts, cross-checked findings' },
};

export const constraintsSchema = z.object({
  /** ISO date (yyyy-mm-dd) or null when not set yet. */
  deadline: z.string().nullable(),
  budgetCredits: z.number().int().nullable(),
  depth: depthSchema.nullable(),
});
export type Constraints = z.infer<typeof constraintsSchema>;

export const researchOptionSchema = z.enum(['library', 'custom', 'mix']);
export type ResearchOption = z.infer<typeof researchOptionSchema>;

/** The brief fields the AI drafted, kept so a human edit can be reverted (AI_NATIVE §3). */
export const briefDraftSchema = z.object({
  objective: z.string().nullable(),
  subjects: z.array(subjectSchema),
  questions: z.array(questionSchema),
  constraints: constraintsSchema,
});
export type BriefDraft = z.infer<typeof briefDraftSchema>;

export const researchBriefSchema = briefDraftSchema.extend({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  goalType: goalTypeSchema.nullable(),
  status: z.enum(['draft', 'confirmed', 'submitted']),
  currentStep: stepIdSchema,
  stepStatus: z.record(stepIdSchema, stepStatusSchema),
  chosenOption: researchOptionSchema.nullable(),
  aiSnapshot: briefDraftSchema.nullable(),
  isEditedByUser: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResearchBrief = z.infer<typeof researchBriefSchema>;

export const briefListSchema = z.array(researchBriefSchema);

/** Fields a client may change from the needs summary card. */
export const briefPatchSchema = z.object({
  objective: z.string().min(10, 'Describe the objective in at least 10 characters.').optional(),
  subjects: z.array(subjectSchema).min(1, 'Keep at least one subject.').optional(),
  questions: z
    .array(questionSchema)
    .min(3, 'Keep at least 3 questions.')
    .max(10, 'Keep 10 questions or fewer.')
    .optional(),
  constraints: constraintsSchema.optional(),
  revertToAi: z.boolean().optional(),
});
export type BriefPatch = z.infer<typeof briefPatchSchema>;
