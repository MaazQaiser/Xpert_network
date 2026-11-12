import { z } from 'zod';

/** A person in a GetSales lead list, shown as an expert of the project built on that list. */
export const listMemberSchema = z.object({
  lead: z.object({
    uuid: z.string(),
    name: z.string(),
    headline: z.string().nullable(),
    company: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  position: z.string().nullable(),
  location: z.string().nullable(),
  /** Across our LinkedIn senders: connected, a request waiting, or neither. */
  connection: z.enum(['connected', 'requested', 'not_connected']),
});
export type ListMember = z.infer<typeof listMemberSchema>;

export const leadListSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  members: z.array(listMemberSchema),
});
export type LeadList = z.infer<typeof leadListSchema>;

export const CONNECTION_LABELS: Record<ListMember['connection'], string> = {
  connected: 'Connected',
  requested: 'Request sent',
  not_connected: 'Not connected',
};

export const CONNECTION_TAG = {
  connected: 'green',
  requested: 'blue',
  not_connected: 'gray',
} as const satisfies Record<ListMember['connection'], string>;

/**
 * A list project's automatic follow-up: when someone on the list replies interested, the server
 * sends them the screening questions as the next message. Off until the team turns it on, and
 * only for replies that arrive after that.
 */
export const listFollowUpSchema = z.object({
  enabled: z.boolean(),
  questions: z.array(z.string()),
  /** Exactly what an interested person gets. */
  message: z.string(),
  enabledAt: z.string().nullable(),
  sentCount: z.number().int().nonnegative(),
});
export type ListFollowUp = z.infer<typeof listFollowUpSchema>;

export const listFollowUpInputSchema = z.object({
  enabled: z.boolean(),
  questions: z.array(z.string().trim().min(1).max(500)).max(10),
});
export type ListFollowUpInput = z.infer<typeof listFollowUpInputSchema>;
