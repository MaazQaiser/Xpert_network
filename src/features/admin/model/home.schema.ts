import { z } from 'zod';

export const homeSummarySchema = z.object({
  emailsToday: z.number().int().min(0),
  expertsPendingReview: z.number().int().min(0),
  newProjectsToday: z.number().int().min(0),
  /** One AI suggestion for where to start, with the record it points at. */
  tip: z.object({ lead: z.string(), detail: z.string(), href: z.string() }).nullable(),
});
export type HomeSummary = z.infer<typeof homeSummarySchema>;

export const assistantReplySchema = z.object({
  id: z.string(),
  text: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  /** What the answer was built from, shown in the AI label. */
  basis: z.string(),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;

export const assistantInputSchema = z.object({ text: z.string().trim().min(1).max(500) });

export const SUGGESTED_PROMPTS = [
  'Summarise today’s new projects',
  'Which experts need my review?',
  'Draft replies for emails missing a brief',
] as const;
