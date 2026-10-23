import { z } from 'zod';

/** How many experts the AI puts on the shortlist (wireframe 04–05). */
export const shortlistSizeSchema = z.union([z.literal(10), z.literal(20), z.literal(30)]);
export type ShortlistSize = z.infer<typeof shortlistSizeSchema>;

export const matchedExpertSchema = z.object({
  id: z.string(),
  /** Display name, e.g. "Expert #4821". Anonymised until booked. */
  label: z.string(),
  role: z.string(),
  years: z.number().int().nonnegative(),
  country: z.string().min(2).max(2),
  matchPercent: z.number().min(0).max(100),
  /** ISO date of the last engagement, or null if never. */
  lastEngagedAt: z.string().nullable(),
  pinned: z.boolean(),
  excluded: z.boolean(),
  /** Bullets the AI uses when this expert is shortlisted. */
  whyPicked: z.array(z.string()).min(1),
  /** How many of the project's client questions this expert can cover. */
  questionsCovered: z.number().int().nonnegative(),
  compliance: z.enum(['cleared', 'pending']),
  /** Placeholder rate string, e.g. "$150". Null until set. */
  rateHint: z.string().nullable(),
});
export type MatchedExpert = z.infer<typeof matchedExpertSchema>;

export const matchResultSchema = z.object({
  projectId: z.string(),
  searchedAt: z.string(),
  /** Total network size the AI searched. */
  searchedCount: z.number().int().positive(),
  durationMs: z.number().int().positive(),
  /** The filters the AI used ("matched on"). */
  filters: z.array(z.string()).min(1),
  experts: z.array(matchedExpertSchema),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

export const rankingWeightsSchema = z.object({
  requirementFit: z.number().int().nonnegative(),
  seniority: z.number().int().nonnegative(),
  pastRatings: z.number().int().nonnegative(),
  availability: z.number().int().nonnegative(),
});
export type RankingWeights = z.infer<typeof rankingWeightsSchema>;

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  requirementFit: 40,
  seniority: 25,
  pastRatings: 20,
  availability: 15,
};

export const questionCoverageSchema = z.object({
  questionId: z.string(),
  /** Short label for the sidebar, e.g. "Market size". */
  label: z.string(),
  coveredBy: z.number().int().nonnegative(),
  /** Max experts that could cover it (usually the shortlist size). */
  of: z.number().int().positive(),
});
export type QuestionCoverage = z.infer<typeof questionCoverageSchema>;

export const shortlistedExpertSchema = matchedExpertSchema.extend({
  rank: z.number().int().positive(),
  selected: z.boolean(),
});
export type ShortlistedExpert = z.infer<typeof shortlistedExpertSchema>;

export const shortlistSchema = z.object({
  projectId: z.string(),
  size: shortlistSizeSchema,
  generatedAt: z.string(),
  fromMatchCount: z.number().int().nonnegative(),
  weights: rankingWeightsSchema,
  experts: z.array(shortlistedExpertSchema),
  coverage: z.array(questionCoverageSchema),
  /** Human-readable gap warning, or null when coverage is fine. */
  gap: z.string().nullable(),
});
export type Shortlist = z.infer<typeof shortlistSchema>;

export const generateShortlistInputSchema = z.object({
  size: shortlistSizeSchema,
});
export type GenerateShortlistInput = z.infer<typeof generateShortlistInputSchema>;

export const matchPatchSchema = z.object({
  expertId: z.string(),
  pinned: z.boolean().optional(),
  excluded: z.boolean().optional(),
});
export type MatchPatch = z.infer<typeof matchPatchSchema>;

export const shortlistPatchSchema = z.object({
  /** Replace which experts are selected for pitching. */
  selectedIds: z.array(z.string()).optional(),
  /** Drop one expert and pull the next-best from the matches. */
  removeId: z.string().optional(),
  /** Replace one shortlisted expert with the next unranked match. */
  swapId: z.string().optional(),
});
export type ShortlistPatch = z.infer<typeof shortlistPatchSchema>;
