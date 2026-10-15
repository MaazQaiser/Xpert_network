import { z } from 'zod';
import { anonymousExpertSchema } from '@/features/library';

export const requestStatusSchema = z.enum([
  'quote_requested',
  'quote_ready',
  'accepted',
  'recruiting',
  'interviews',
  'analysis',
  'delivered',
  'declined',
  'expired',
  'cancelled',
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

/** The happy-path stages shown in the tracker (PRODUCT_PLAN F4 step 3). */
export const TRACKER_STEPS = [
  'quote_requested',
  'quote_ready',
  'accepted',
  'recruiting',
  'interviews',
  'analysis',
  'delivered',
] as const satisfies readonly RequestStatus[];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  quote_requested: 'Quote requested',
  quote_ready: 'Quote ready',
  accepted: 'Accepted',
  recruiting: 'Recruiting experts',
  interviews: 'Interviews',
  analysis: 'Analysis',
  delivered: 'Delivered',
  declined: 'Declined',
  expired: 'Quote expired',
  cancelled: 'Cancelled',
};

/** Short labels for the tracker, where Carbon truncates long step labels. */
export const TRACKER_LABELS: Record<(typeof TRACKER_STEPS)[number], string> = {
  quote_requested: 'Requested',
  quote_ready: 'Quote',
  accepted: 'Accepted',
  recruiting: 'Recruiting',
  interviews: 'Interviews',
  analysis: 'Analysis',
  delivered: 'Delivered',
};

export const requestQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  topic: z.string(),
});
export type RequestQuestion = z.infer<typeof requestQuestionSchema>;

export const quoteSchema = z.object({
  version: z.number().int().positive(),
  credits: z.number().int().positive(),
  experts: z.number().int().positive(),
  etaDays: z.number().int().positive(),
  /** Question ids the research will answer. */
  questionIdsIn: z.array(z.string()),
  /** Questions left out, with the reason (honest scoping). */
  questionsOut: z.array(z.object({ questionId: z.string(), reason: z.string() })),
  includes: z.array(z.string()),
  validUntil: z.string(),
  issuedAt: z.string(),
  /** What changed when the quote was revised. */
  revisionNote: z.string().nullable(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const requestMessageSchema = z.object({
  id: z.string(),
  author: z.enum(['client', 'xpert']),
  text: z.string(),
  at: z.string(),
});
export type RequestMessage = z.infer<typeof requestMessageSchema>;

export const timelineEntrySchema = z.object({
  status: requestStatusSchema,
  at: z.string(),
  note: z.string().nullable(),
});

export const customRequestSchema = z.object({
  id: z.string(),
  briefId: z.string().nullable(),
  title: z.string(),
  objective: z.string().nullable(),
  status: requestStatusSchema,
  questions: z.array(requestQuestionSchema),
  quote: quoteSchema.nullable(),
  timeline: z.array(timelineEntrySchema),
  messages: z.array(requestMessageSchema),
  progress: z.object({
    interviewsDone: z.number().int().min(0),
    interviewsPlanned: z.number().int().min(0),
    experts: z.array(anonymousExpertSchema),
    estimatedDelivery: z.string().nullable(),
  }),
  delivery: z
    .object({
      reportId: z.string(),
      partial: z.boolean(),
      refundCredits: z.number().int().min(0),
      rating: z.number().int().min(1).max(5).nullable(),
    })
    .nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomRequest = z.infer<typeof customRequestSchema>;

export const DECLINE_REASONS = [
  'Too expensive',
  'Takes too long',
  'Scope doesn’t fit',
  'Found the answer elsewhere',
  'Other',
] as const;

export const declineInputSchema = z.object({
  reason: z.enum(DECLINE_REASONS),
  comment: z.string().trim().max(500),
});
export type DeclineInput = z.infer<typeof declineInputSchema>;

export const messageInputSchema = z.object({
  text: z.string().trim().min(2, 'Write a question first.').max(1000),
});

export const rateInputSchema = z.object({ rating: z.number().int().min(1).max(5) });

/** Where a request sits on the tracker; off-track states map to where they stopped. */
export function trackerIndex(request: Pick<CustomRequest, 'status' | 'timeline'>): number {
  const onTrack = TRACKER_STEPS.indexOf(request.status as (typeof TRACKER_STEPS)[number]);
  if (onTrack >= 0) return onTrack;
  const last = [...request.timeline]
    .reverse()
    .find((t) => TRACKER_STEPS.includes(t.status as (typeof TRACKER_STEPS)[number]));
  return last ? TRACKER_STEPS.indexOf(last.status as (typeof TRACKER_STEPS)[number]) : 0;
}

export function isActive(status: RequestStatus): boolean {
  return !['delivered', 'declined', 'expired', 'cancelled'].includes(status);
}
