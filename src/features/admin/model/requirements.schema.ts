import { z } from 'zod';

/**
 * A brief's requirements and screening questions, pulled out of the client's email by the
 * requirements agent, for the project manager to edit and accept. Each bullet and question keeps
 * the email's words it came from.
 */
export const requirementSectionKeySchema = z.enum([
  'who',
  'must_have',
  'nice_to_have',
  'exclude',
  'quotas',
  'logistics',
  'to_confirm',
]);
export type RequirementSectionKey = z.infer<typeof requirementSectionKeySchema>;

export const requirementItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** The email's words it came from; null for what the email doesn't say, or a PM's own bullet. */
  source: z.string().nullable(),
  /** Whether those words really are in the email. */
  sourceFound: z.boolean(),
});
export type RequirementItem = z.infer<typeof requirementItemSchema>;

/** open: free text; single: pick one; multi: select all that apply. */
export const answerTypeSchema = z.enum(['open', 'single', 'multi']);
export type AnswerType = z.infer<typeof answerTypeSchema>;

/**
 * What can only be learnt by asking the person, not by searching. The client's own screener is
 * used as it is; without one, the AI suggests questions; the project manager can add their own.
 */
export const screeningQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  answerType: answerTypeSchema,
  /** The answers to pick from; picking a disqualifying one rules the person out ("DQ"). */
  options: z.array(z.object({ text: z.string(), disqualifies: z.boolean() })),
  /** When to ask it, if only sometimes, e.g. "If they select Skilled Nursing Center in Q2". */
  condition: z.string().nullable(),
  /** How to judge the answer, e.g. a DQ rule for an open question. */
  note: z.string().nullable(),
  origin: z.enum(['client', 'ai', 'pm']),
  source: z.string().nullable(),
  sourceFound: z.boolean(),
});
export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;

/**
 * How a requirement is searched: `filter` (profile search can express it), `exa` (only the web
 * can tell), `screening` (only asking can tell) or `none` (not about the person).
 */
export const searchRouteSchema = z.enum(['filter', 'exa', 'screening', 'none']);
export type SearchRoute = z.infer<typeof searchRouteSchema>;

/**
 * The search plan the AI makes from the accepted requirements: each requirement's route, the
 * results table's columns (sorted into shared columns and profile groups), the profile search
 * filters and the web searches. Read-only for the project manager.
 */
export const searchPlanSchema = z.object({
  routes: z.array(
    z.object({
      requirementId: z.string(),
      route: searchRouteSchema,
      /** The screening questions (numbered from 1) that cover it, for the screening route. */
      questions: z.array(z.number().int()),
    }),
  ),
  columns: z.array(
    z.object({
      id: z.string(),
      requirementId: z.string(),
      label: z.string(),
      route: z.enum(['filter', 'exa']),
      /** The profile group it belongs to; null for a column every match needs. */
      group: z.string().nullable(),
      /** False for a nice-to-have: shown, but never counts toward a match. */
      counts: z.boolean(),
    }),
  ),
  groups: z.array(z.object({ name: z.string(), quota: z.number().int().nullable() })),
  filters: z.array(
    z.object({
      field: z.string(),
      values: z.array(z.string()),
      exclude: z.boolean(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      /** The requirement ids it covers. */
      covers: z.array(z.string()),
    }),
  ),
  queries: z.array(
    z.object({
      query: z.string(),
      purpose: z.enum(['companies', 'people', 'check']),
      covers: z.array(z.string()),
    }),
  ),
});
export type SearchPlan = z.infer<typeof searchPlanSchema>;
export type SearchPlanColumn = SearchPlan['columns'][number];
export type SearchPlanGroup = SearchPlan['groups'][number];

export const briefRequirementsSchema = z.object({
  briefId: z.string(),
  company: z.string(),
  subject: z.string(),
  /** The email's attachment, if any: it may hold the client's screener, which can't be read yet. */
  attachment: z.string().nullable(),
  status: z.enum(['draft', 'accepted']),
  summary: z.string(),
  /** Changed by the project manager since the AI's draft. */
  edited: z.boolean(),
  sections: z.array(
    z.object({
      key: requirementSectionKeySchema,
      title: z.string(),
      items: z.array(requirementItemSchema),
    }),
  ),
  questions: z.array(screeningQuestionSchema),
  updatedAt: z.string(),
  acceptedAt: z.string().nullable(),
  /** How many people the client wants; null when the email doesn't say. */
  icpCount: z.number().int().nullable(),
  /** The search plan is made in the background after every save: this is where it stands. */
  planStatus: z.enum(['updating', 'ready', 'failed']).nullable(),
  /** Whether the plan was made from the requirements as they now stand. */
  planCurrent: z.boolean(),
  plan: searchPlanSchema.nullable(),
});
export type BriefRequirements = z.infer<typeof briefRequirementsSchema>;

/** A question as the PM saves it (a new one without an id). */
export type ScreeningQuestionEdit = {
  id?: string;
  text: string;
  answerType: AnswerType;
  options: { text: string; disqualifies: boolean }[];
  condition: string | null;
  note: string | null;
};

/**
 * What's saved when the PM edits: each section's bullets (new ones without an id), and the
 * questions when they changed (left out, they stay as they are).
 */
export type RequirementsEdits = {
  sections: {
    key: RequirementSectionKey;
    items: { id?: string; text: string; source?: string | null }[];
  }[];
  questions?: ScreeningQuestionEdit[];
  /** The number of ICPs needed (1–50); left out, it stays as it is. */
  icpCount?: number;
};
