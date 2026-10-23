import { z } from 'zod';
import { timeSlotSchema } from './availability.schema';

/** Screens 11–13: the client's picks, the sync with the experts, and the booked calls. */
export const bookingStageSchema = z.enum(['picked', 'synced', 'booked']);
export type BookingStage = z.infer<typeof bookingStageSchema>;

const bookingExpertSchema = z.object({
  expertId: z.string(),
  /** The letter the client knows them by while names are hidden. */
  letter: z.string().length(1),
  name: z.string(),
  photoUrl: z.string().nullable(),
  role: z.string(),
  rateHint: z.string().nullable(),
});

export const bookingPickSchema = bookingExpertSchema.extend({
  slot: timeSlotSchema,
  /** Indexes of the client's questions this expert covers. */
  covers: z.array(z.number().int().nonnegative()),
  /** A request the client added for this call, e.g. "their night-hiking setup". */
  note: z.string().nullable(),
  /** When the expert re-confirmed the client's time (screen 12). */
  confirmedAt: z.string().nullable(),
});
export type BookingPick = z.infer<typeof bookingPickSchema>;

export const notPickedSchema = bookingExpertSchema.extend({
  /** Kept on standby in case the client wants more calls; otherwise the hold is released. */
  standby: z.boolean(),
});
export type NotPicked = z.infer<typeof notPickedSchema>;

const messageCopySchema = z.object({ intro: z.string(), closing: z.string() });

export const bookingMessageSchema = z.object({
  subject: z.string(),
  intro: z.string(),
  closing: z.string(),
  attachInvites: z.boolean(),
  revealNames: z.boolean(),
  /** The AI's draft and its shorter version, so edits can go back to either. */
  ai: messageCopySchema,
  short: messageCopySchema,
});
export type BookingMessage = z.infer<typeof bookingMessageSchema>;

export const checklistItemSchema = z.object({
  label: z.string(),
  /** When the AI did it; null while it is still scheduled. */
  doneAt: z.string().nullable(),
  scheduledFor: z.string().nullable(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const bookingSchema = z.object({
  projectId: z.string(),
  client: z.object({ name: z.string(), email: z.string(), company: z.string() }),
  /** The client's reply email (it lands in the projects inbox). */
  reply: z.object({
    inboxId: z.string(),
    from: z.string(),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    receivedAt: z.string(),
  }),
  questionTopics: z.array(z.string()),
  picks: z.array(bookingPickSchema).min(1),
  notPicked: z.array(notPickedSchema),
  /** What the AI will do next, read from the client's reply. `lead` is the bold verb. */
  nextSteps: z.array(z.object({ lead: z.string().nullable(), text: z.string() })),
  stage: bookingStageSchema,
  syncedAt: z.string().nullable(),
  message: bookingMessageSchema,
  messageSavedAt: z.string().nullable(),
  bookedAt: z.string().nullable(),
  version: z.string(),
  checklist: z.array(checklistItemSchema),
  call: z.object({
    moderator: z.string(),
    where: z.string(),
    recording: z.string(),
    reminders: z.string(),
  }),
  briefing: z.object({
    context: z.string(),
    questions: z.array(z.string()),
    doNotShare: z.string(),
  }),
});
export type Booking = z.infer<typeof bookingSchema>;

export const bookingMessageInputSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, 'Add a subject.')
    .max(140, 'Keep the subject under 140 characters.'),
  intro: z
    .string()
    .trim()
    .min(10, 'Add a short opening.')
    .max(1500, 'Keep it under 1500 characters.'),
  closing: z
    .string()
    .trim()
    .min(5, 'Add a short closing.')
    .max(1500, 'Keep it under 1500 characters.'),
  attachInvites: z.boolean(),
  revealNames: z.boolean(),
});
export type BookingMessageInput = z.infer<typeof bookingMessageInputSchema>;

/** Everything the PM can do on screens 11–13, one endpoint. */
export const bookingActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync'), standbyIds: z.array(z.string()) }),
  z.object({ action: z.literal('save_message'), message: bookingMessageInputSchema }),
  z.object({ action: z.literal('lock'), message: bookingMessageInputSchema }),
  z.object({ action: z.literal('unlock') }),
]);
export type BookingAction = z.infer<typeof bookingActionSchema>;
