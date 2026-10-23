import { z } from 'zod';

/** Where an expert is with confirming their call times (screen 09). */
export const availabilityStatusSchema = z.enum(['confirmed', 'waiting', 'declined']);
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  confirmed: 'Confirmed',
  waiting: 'Waiting',
  declined: 'Declined',
};

export const timeSlotSchema = z.object({
  id: z.string(),
  /** ISO start time; calls are 60 minutes. */
  startsAt: z.string(),
});
export type TimeSlot = z.infer<typeof timeSlotSchema>;

export const expertAvailabilitySchema = z.object({
  expertId: z.string(),
  label: z.string(),
  role: z.string(),
  /** How the client sees this expert: anonymised, e.g. "Expert A · VP Operations". */
  clientLabel: z.string(),
  status: availabilityStatusSchema,
  complianceSigned: z.boolean(),
  slots: z.array(timeSlotSchema),
});
export type ExpertAvailability = z.infer<typeof expertAvailabilitySchema>;

export const availabilitySchema = z.object({
  projectId: z.string(),
  /** When the AI asked the experts for their times. */
  askedAt: z.string(),
  /** Times are shown in the client's timezone. */
  timeZone: z.string(),
  clientName: z.string(),
  experts: z.array(expertAvailabilitySchema),
  /** Set once the experts were sent to the client (from screen 10). */
  sentToClientAt: z.string().nullable(),
});
export type Availability = z.infer<typeof availabilitySchema>;

/** Everything the PM can do on screen 09, one endpoint. */
export const availabilityActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('nudge'), expertIds: z.array(z.string()).min(1) }),
  z.object({ action: z.literal('resend_compliance'), expertId: z.string() }),
  z.object({
    action: z.literal('message'),
    expertId: z.string(),
    text: z.string().trim().min(2, 'Write a short message.').max(1000),
  }),
  // Hands the chosen experts and times to screen 10, where the client email is drafted.
  z.object({
    action: z.literal('prepare_client'),
    holdSlots: z.boolean(),
    experts: z
      .array(z.object({ expertId: z.string(), slotIds: z.array(z.string()).min(1) }))
      .min(1),
  }),
]);
export type AvailabilityAction = z.infer<typeof availabilityActionSchema>;

export const availabilityActionResultSchema = z.object({
  ok: z.literal(true),
  /** Who the action reached, for the confirmation message. */
  count: z.number().int().nonnegative(),
  sentToClientAt: z.string().nullable(),
});
export type AvailabilityActionResult = z.infer<typeof availabilityActionResultSchema>;
