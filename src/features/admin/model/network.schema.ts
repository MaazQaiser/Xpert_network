import { z } from 'zod';

/** What an expert in the network is known for: the sector they've worked in for us. */
export const networkSectorSchema = z.enum([
  'industrial',
  'food',
  'logistics',
  'aviation',
  'environment',
  'consumer',
]);
export type NetworkSector = z.infer<typeof networkSectorSchema>;

export const NETWORK_SECTOR_LABELS: Record<NetworkSector, string> = {
  industrial: 'Industrial automation',
  food: 'Food & beverage',
  logistics: 'Cold chain & logistics',
  aviation: 'Aviation & MRO',
  environment: 'Environmental services',
  consumer: 'Outdoor & consumer audio',
};

const workRoleSchema = z.object({
  title: z.string(),
  org: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int().nullable(),
  location: z.string(),
});

/**
 * One expert in the Xpert Network database: people who signed up and were vetted, as opposed
 * to the LinkedIn and partner-API finds the AI brings in for a single project.
 */
export const networkExpertSchema = z.object({
  id: z.string(),
  name: z.string(),
  photoUrl: z.string().nullable(),
  /** Their headline role, e.g. "Former Director of Product, audio wearables". */
  headline: z.string(),
  sector: networkSectorSchema,
  country: z.string().min(2).max(2),
  years: z.number().int().nonnegative(),
  /** e.g. "$150"; null until agreed. */
  rateHint: z.string().nullable(),
  compliance: z.enum(['cleared', 'pending']),
  linkedinUrl: z.string().url().nullable(),
  joinedAt: z.string(),
  lastEngagedAt: z.string().nullable(),
  /** What they bring, in the AI's words from their profile and past work. */
  knownFor: z.array(z.string()),
  history: z.array(workRoleSchema),
  /** Projects the AI matched them to. */
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      client: z.string(),
      matchPercent: z.number().nullable(),
    }),
  ),
  /** Calls they've been booked on. */
  calls: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['upcoming', 'live', 'completed']),
      projectName: z.string(),
      client: z.string(),
      startsAt: z.string(),
      minutes: z.number().int().positive(),
    }),
  ),
});
export type NetworkExpert = z.infer<typeof networkExpertSchema>;
