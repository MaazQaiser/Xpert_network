import { z } from 'zod';

/** A person on LinkedIn, as GetSales has them (Home chat: look up a profile, then message it). */
export const linkedinProfileSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  headline: z.string().nullable(),
  position: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  linkedinUrl: z.string(),
  connections: z.number().int().nullable(),
  followers: z.number().int().nullable(),
  premium: z.boolean(),
  openProfile: z.boolean(),
  about: z.string().nullable(),
  experience: z.array(
    z.object({
      position: z.string().nullable(),
      company: z.string().nullable(),
      start: z.string().nullable(),
      end: z.string().nullable(),
    }),
  ),
  /** False until GetSales has read the profile from LinkedIn (a minute or two for someone new). */
  enriched: z.boolean(),
  /** False for a minute after GetSales adds someone, while their connection status arrives. */
  settled: z.boolean(),
  /** Senders this person is a 1st-degree connection of; LinkedIn only delivers to those. */
  connectedSenderUuids: z.array(z.string()),
  /** Senders whose connection request to them is queued or sent, not yet accepted. */
  requestedSenderUuids: z.array(z.string()),
});
export type LinkedinProfile = z.infer<typeof linkedinProfileSchema>;

const PROFILE_URL = /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[^/?#\s]+\/?(?:\?[^\s]*)?/i;

/** The LinkedIn profile link in what someone typed, or null when there isn't one. */
export function findLinkedinProfileUrl(text: string): string | null {
  return text.match(PROFILE_URL)?.[0] ?? null;
}
