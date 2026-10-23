import { z } from 'zod';
import { timeSlotSchema } from './availability.schema';

/** One expert as the client sees them in the email (screen 10). Anonymised until booked. */
export const clientExpertSchema = z.object({
  expertId: z.string(),
  /** "A", "B", … */
  letter: z.string().length(1),
  /** The expert's real label, for the PM only (e.g. "Expert #4821"). */
  label: z.string(),
  /** The expert's name and portrait, for the PM only; the client sees "Expert A" until booked. */
  name: z.string(),
  photoUrl: z.string().nullable(),
  role: z.string(),
  years: z.number().int().nonnegative(),
  country: z.string(),
  /** A short quote from their screening answers. */
  quote: z.string(),
  /** The client topics this expert is strongest on. */
  bestFor: z.array(z.string()),
  /** Indexes of the client's questions this expert covers. */
  covers: z.array(z.number().int().nonnegative()),
  rateHint: z.string().nullable(),
  slots: z.array(timeSlotSchema),
});
export type ClientExpert = z.infer<typeof clientExpertSchema>;

export const clientSettingsSchema = z.object({
  hideNames: z.boolean(),
  includeSummary: z.boolean(),
  pickUpToTwo: z.boolean(),
  showRates: z.boolean(),
  /** ISO time the client should reply by; the slots are held until then. */
  replyBy: z.string(),
});
export type ClientSettings = z.infer<typeof clientSettingsSchema>;

export const clientDraftSchema = z.object({
  projectId: z.string(),
  to: z.object({ name: z.string(), email: z.string() }),
  subject: z.string(),
  intro: z.string(),
  experts: z.array(clientExpertSchema),
  /** Short topic per client question, e.g. "Market size". */
  questionTopics: z.array(z.string()),
  settings: clientSettingsSchema,
  replyByOptions: z.array(z.string()),
  holdSlots: z.boolean(),
  savedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
});
export type ClientDraft = z.infer<typeof clientDraftSchema>;

export const clientDraftInputSchema = z.object({
  action: z.enum(['save', 'send']),
  subject: z
    .string()
    .trim()
    .min(3, 'Add a subject.')
    .max(140, 'Keep the subject under 140 characters.'),
  intro: z
    .string()
    .trim()
    .min(10, 'Add a short note to the client.')
    .max(1200, 'Keep the note under 1200 characters.'),
  expertIds: z.array(z.string()).min(1, 'Keep at least one expert in the email.'),
  settings: clientSettingsSchema,
});
export type ClientDraftInput = z.infer<typeof clientDraftInputSchema>;
