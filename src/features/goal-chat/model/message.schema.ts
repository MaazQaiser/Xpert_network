import { z } from 'zod';
import {
  goalTypeSchema,
  researchOptionSchema,
  subjectSchema,
  questionSchema,
} from './brief.schema';
import { coverageResultSchema } from './coverage.schema';
import { stepIdSchema } from './steps';

export const chipSchema = z.object({ id: z.string(), label: z.string() });
export type Chip = z.infer<typeof chipSchema>;

/** Structured UI the assistant attaches to a message. Only the latest one is interactive. */
export const widgetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('goal-types'), options: z.array(goalTypeSchema) }),
  z.object({ kind: z.literal('starters'), chips: z.array(chipSchema) }),
  z.object({
    kind: z.literal('subjects'),
    suggestions: z.array(subjectSchema),
    /** "Did you mean…" candidates for the last unresolved entry. */
    candidates: z.array(subjectSchema),
    unresolved: z.string().nullable(),
  }),
  z.object({ kind: z.literal('questions'), suggestions: z.array(questionSchema) }),
  z.object({ kind: z.literal('constraints') }),
  z.object({ kind: z.literal('summary') }),
  z.object({ kind: z.literal('options'), coverage: coverageResultSchema }),
  z.object({ kind: z.literal('checkout'), option: researchOptionSchema }),
  z.object({
    kind: z.literal('done'),
    option: researchOptionSchema,
    purchasedReportIds: z.array(z.string()),
    requestId: z.string().nullable(),
  }),
  z.object({ kind: z.literal('library-report'), reportId: z.string() }),
  z.object({
    kind: z.literal('library-search'),
    steps: z.array(z.string().min(1)).min(1).max(4),
  }),
  z.object({
    kind: z.literal('report-artifact'),
    reportId: z.string(),
    title: z.string(),
    finding: z.string(),
    sources: z.array(z.object({ label: z.string(), percent: z.number().int().min(0).max(100) })),
  }),
  z.object({
    kind: z.literal('custom-request'),
    requestId: z.string(),
    /** What the library does not cover, shown in the closing box. */
    gap: z.string(),
  }),
]);
export type Widget = z.infer<typeof widgetSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['assistant', 'user']),
  text: z.string(),
  step: stepIdSchema,
  widget: widgetSchema.nullable(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
