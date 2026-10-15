import { z } from 'zod';
import { goalTypeSchema } from '@/features/goal-chat';

export const CLIENT_STEP_IDS = ['about', 'interests', 'goal'] as const;
export const clientStepSchema = z.enum(CLIENT_STEP_IDS);
export type ClientStep = z.infer<typeof clientStepSchema>;

export const CLIENT_STEP_LABELS: Record<ClientStep, string> = {
  about: 'About you',
  interests: 'What you research',
  goal: 'First goal',
};

export const clientSegmentSchema = z.enum([
  'investor',
  'operator',
  'consultant',
  'corporate',
  'other',
]);
export type ClientSegment = z.infer<typeof clientSegmentSchema>;

export const CLIENT_SEGMENTS: Record<ClientSegment, { label: string; detail: string }> = {
  investor: { label: 'Investor or analyst', detail: 'Private equity, VC, family office, fund' },
  operator: { label: 'Business owner or operator', detail: 'Franchisee, retailer, F&B operator' },
  consultant: { label: 'Consultant or advisor', detail: 'Strategy, deals, market entry' },
  corporate: { label: 'Corporate strategy', detail: 'In-house strategy or development team' },
  other: { label: 'Something else', detail: 'Tell us more in your job title' },
};

export const clientOnboardingStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'skipped',
  'complete',
]);
export type ClientOnboardingStatus = z.infer<typeof clientOnboardingStatusSchema>;

export const clientAboutSchema = z.object({
  segment: clientSegmentSchema.nullable(),
  jobTitle: z.string(),
  organisation: z.string(),
});
export type ClientAbout = z.infer<typeof clientAboutSchema>;

export const clientInterestsSchema = z.object({
  industryIds: z.array(z.string()),
  regionIds: z.array(z.string()),
});
export type ClientInterests = z.infer<typeof clientInterestsSchema>;

export const clientOnboardingSchema = z.object({
  status: clientOnboardingStatusSchema,
  currentStep: clientStepSchema,
  about: clientAboutSchema,
  interests: clientInterestsSchema,
  firstGoal: goalTypeSchema.nullable(),
  updatedAt: z.string(),
});
export type ClientOnboarding = z.infer<typeof clientOnboardingSchema>;

export const clientOnboardingPatchSchema = z.object({
  status: clientOnboardingStatusSchema.optional(),
  currentStep: clientStepSchema.optional(),
  about: clientAboutSchema.optional(),
  interests: clientInterestsSchema.optional(),
  firstGoal: goalTypeSchema.nullable().optional(),
});
export type ClientOnboardingPatch = z.infer<typeof clientOnboardingPatchSchema>;

// ——— Form schemas (one per step) —————————————————————————————————————

export const aboutFormSchema = z.object({
  segment: clientSegmentSchema
    .nullable()
    .refine((v) => v !== null, 'Choose what best describes you.'),
  jobTitle: z.string().trim().min(2, 'Enter your job title, like “Investment analyst”.'),
  organisation: z.string().trim(),
});
export type AboutFormInput = z.input<typeof aboutFormSchema>;
export type AboutFormValues = z.output<typeof aboutFormSchema>;

export const interestsFormSchema = z.object({
  industryIds: z.array(z.string()).min(1, 'Choose at least one industry.'),
  regionIds: z.array(z.string()).min(1, 'Choose at least one region.'),
});
export type InterestsFormValues = z.infer<typeof interestsFormSchema>;
