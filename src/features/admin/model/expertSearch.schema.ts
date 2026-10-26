import { z } from 'zod';
import { matchedExpertSchema } from './match.schema';

/** Where "Extend research" looks for more experts. */
export const expertSourceSchema = z.enum(['linkedin', 'api']);
export type ExpertSource = z.infer<typeof expertSourceSchema>;

export const EXPERT_SOURCE_LABELS: Record<ExpertSource, string> = {
  linkedin: 'LinkedIn',
  api: 'Expert network API',
};

/** The "Extend research" sheet: how many more experts, how senior, what they must know, where. */
export const extendResearchSchema = z
  .object({
    minExperts: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(1, 'Ask for at least 1 expert.')
      .max(50, 'Ask for 50 or fewer at a time.'),
    maxExperts: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(1, 'Ask for at least 1 expert.')
      .max(50, 'Ask for 50 or fewer at a time.'),
    minYears: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(0, 'Years can’t be negative.')
      .max(40, 'Use 40 years or fewer.'),
    knowledge: z
      .string()
      .trim()
      .min(3, 'Describe what the experts should know.')
      .max(300, 'Keep this under 300 characters.'),
    sources: z.array(expertSourceSchema).min(1, 'Choose at least one source.'),
  })
  .refine((value) => value.minExperts <= value.maxExperts, {
    message: 'The maximum must be at least the minimum.',
    path: ['maxExperts'],
  });
export type ExtendResearch = z.infer<typeof extendResearchSchema>;

export const expertSearchInputSchema = z.object({
  /** How many experts the table already shows; the search returns the next batch. */
  offset: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(50),
  criteria: extendResearchSchema.optional(),
  /** Experts already shown, so an extended search only returns new people. */
  excludeIds: z.array(z.string()).max(500).optional(),
});
export type ExpertSearchInput = z.infer<typeof expertSearchInputSchema>;

export const expertSearchResultSchema = z.object({
  experts: z.array(matchedExpertSchema),
  /** Experts left in the pool after this batch. */
  remaining: z.number().int().nonnegative(),
  /** Experts who have already been sent the screening questions. */
  screeningSent: z.array(z.string()),
});
export type ExpertSearchResult = z.infer<typeof expertSearchResultSchema>;

export const screeningInputSchema = z.object({ expertId: z.string().min(1) });
export const screeningResultSchema = z.object({ screeningSent: z.array(z.string()) });
