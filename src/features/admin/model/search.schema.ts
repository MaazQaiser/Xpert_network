import { z } from 'zod';
import { searchPlanSchema } from './requirements.schema';

/**
 * A people search for a brief: the AI hunts with profile search and web search until the number
 * of ICPs needed is found, judging each person Match, Miss or Unclear on every searchable
 * requirement (a column). The backend streams it as it goes.
 */
export const verdictSchema = z.enum(['match', 'miss', 'unclear']);
export type Verdict = z.infer<typeof verdictSchema>;

/** One cell: the verdict on one requirement, why, and the pages it rests on. */
export const cellVerdictSchema = z.object({
  verdict: verdictSchema,
  reason: z.string(),
  references: z.array(z.string()).default([]),
});
export type CellVerdict = z.output<typeof cellVerdictSchema>;

export const searchPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  linkedinUrl: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  /** Where they were found: profile search (fullenrich) or the web (exa). */
  source: z.enum(['fullenrich', 'exa']),
  sourceUrl: z.string().nullable(),
  /** Column id → verdict. */
  verdicts: z.record(z.string(), cellVerdictSchema),
  isMatch: z.boolean(),
  /** The profile group they matched on, if any. */
  profileGroup: z.string().nullable(),
  /** A LinkedIn URL, email or phone: without one, a match doesn't count. */
  hasContact: z.boolean(),
  addedAt: z.string(),
});
export type SearchPerson = z.output<typeof searchPersonSchema>;

export const searchStatusSchema = z.enum([
  'running',
  'found',
  'stopped',
  'budget_reached',
  'exhausted',
  'failed',
]);
export type SearchStatus = z.infer<typeof searchStatusSchema>;

export const searchProgressSchema = z.object({
  matches: z.number().int().min(0),
  byGroup: z.array(
    z.object({
      name: z.string(),
      found: z.number().int().min(0),
      quota: z.number().int().nullable(),
    }),
  ),
  done: z.boolean(),
  /** People looked at so far, if the backend sends it here. */
  analysed: z.number().int().min(0).optional(),
});
export type SearchProgress = z.infer<typeof searchProgressSchema>;

export const searchCostSchema = z.object({
  exaDollars: z.number(),
  fullenrichCredits: z.number(),
  /** Null when no dollar rate per credit is set. */
  fullenrichDollars: z.number().nullable(),
  totalDollars: z.number(),
});
export type SearchCost = z.infer<typeof searchCostSchema>;

export const searchSchema = z.object({
  id: z.string(),
  briefId: z.string(),
  status: searchStatusSchema,
  note: z.string().nullable(),
  target: z.number().int(),
  /** Frozen when the search started. */
  columns: searchPlanSchema.shape.columns,
  groups: searchPlanSchema.shape.groups,
  /** In arrival order. */
  people: z.array(searchPersonSchema),
  progress: searchProgressSchema,
  cost: searchCostSchema,
  /** People looked at so far, if the backend sends it. */
  analysed: z.number().int().min(0).optional(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type Search = z.output<typeof searchSchema>;

/** A brief's searches, newest first. */
export const searchSummarySchema = z.object({
  id: z.string(),
  status: searchStatusSchema,
  target: z.number().int(),
  matches: z.number().int().min(0),
  startedAt: z.string(),
});
export type SearchSummary = z.infer<typeof searchSummarySchema>;

/** The live stream: a snapshot, then people and progress as they change, then done. */
export const searchEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('snapshot'), search: searchSchema }),
  z.object({ type: z.literal('person'), person: searchPersonSchema }),
  z.object({
    type: z.literal('progress'),
    progress: searchProgressSchema,
    cost: searchCostSchema,
    status: searchStatusSchema,
    note: z.string().nullable(),
  }),
  z.object({ type: z.literal('done'), search: searchSchema }),
]);
export type SearchEvent = z.output<typeof searchEventSchema>;
