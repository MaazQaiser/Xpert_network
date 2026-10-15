import { z } from 'zod';

export const EXPERT_STEP_IDS = ['basics', 'work', 'expertise', 'compliance', 'submit'] as const;
export const expertStepSchema = z.enum(EXPERT_STEP_IDS);
export type ExpertStep = z.infer<typeof expertStepSchema>;

export const EXPERT_STEP_LABELS: Record<ExpertStep, string> = {
  basics: 'Basics',
  work: 'Work history',
  expertise: 'Expertise & regions',
  compliance: 'Compliance & conflicts',
  submit: 'Submit',
};

/** not_started → in_progress → pending (submitted) → approved | rejected (→ in_progress again). */
export const vettingStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'pending',
  'approved',
  'rejected',
]);
export type VettingStatus = z.infer<typeof vettingStatusSchema>;

const CURRENT_YEAR = 2026;
const yearField = z.string().regex(/^\d{4}$/, 'Choose a year.');

export const basicsSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(10, 'Describe your expertise in a short line, like “Former supply-chain manager, F&B”.')
    .max(90, 'Keep it under 90 characters.'),
  yearsExperience: z
    .number({ error: 'Enter your years of experience.' })
    .int('Use whole years.')
    .min(1, 'You need at least 1 year of experience.')
    .max(60, 'Enter 60 years or fewer.'),
  countryId: z.string().min(1, 'Choose the country you’re based in.'),
  linkedinUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(v),
      'Use a profile link like https://www.linkedin.com/in/your-name.',
    ),
});
export type Basics = z.infer<typeof basicsSchema>;

export const positionSchema = z
  .object({
    id: z.string(),
    company: z.string().trim().min(1, 'Enter the company.'),
    title: z.string().trim().min(1, 'Enter your role.'),
    startYear: yearField,
    /** Empty while the role is current. */
    endYear: z.union([yearField, z.literal('')]),
  })
  .refine((p) => p.endYear === '' || Number(p.endYear) >= Number(p.startYear), {
    path: ['endYear'],
    message: 'End year can’t be before the start year.',
  });
export type Position = z.infer<typeof positionSchema>;

export const workHistorySchema = z.object({
  positions: z
    .array(positionSchema)
    .min(1, 'Add at least one role.')
    .max(6, 'Add up to 6 roles — the most relevant ones.'),
});
export type WorkHistory = z.infer<typeof workHistorySchema>;

export const expertiseSchema = z.object({
  industryIds: z.array(z.string()).min(1, 'Choose at least one industry.'),
  topicIds: z
    .array(z.string())
    .min(1, 'Choose at least one topic.')
    .max(8, 'Choose up to 8 topics you know best.'),
  regionIds: z.array(z.string()).min(1, 'Choose at least one region.'),
  languageIds: z.array(z.string()).min(1, 'Choose at least one language.'),
});
export type Expertise = z.infer<typeof expertiseSchema>;

export const employerPermissionSchema = z.enum(['not_employed', 'permitted', 'not_sure']);
export type EmployerPermission = z.infer<typeof employerPermissionSchema>;

const mustAttest = (message: string) => z.boolean().refine((v) => v, message);

export const complianceSchema = z.object({
  employerPermission: employerPermissionSchema,
  /** Companies the expert can't discuss (current/recent employers, clients, holdings). */
  conflicts: z.string().trim().max(500, 'Keep this under 500 characters.'),
  isPublicOfficial: z.boolean(),
  attestConfidentiality: mustAttest('Confirm you won’t share confidential information.'),
  attestInsider: mustAttest('Confirm you won’t share material non-public information.'),
  attestAccuracy: mustAttest('Confirm your profile is accurate.'),
});
export type Compliance = z.infer<typeof complianceSchema>;

export const expertOnboardingSchema = z.object({
  status: vettingStatusSchema,
  currentStep: expertStepSchema,
  basics: basicsSchema.nullable(),
  work: workHistorySchema.nullable(),
  expertise: expertiseSchema.nullable(),
  compliance: complianceSchema.nullable(),
  submittedAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  /** Shown to the expert when rejected; actionable (UX_PRINCIPLES §9). */
  decisionNote: z.string().nullable(),
  updatedAt: z.string(),
});
export type ExpertOnboarding = z.infer<typeof expertOnboardingSchema>;

/** Saving one step's answers. */
export const expertStepInputSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('basics'), data: basicsSchema }),
  z.object({ step: z.literal('work'), data: workHistorySchema }),
  z.object({ step: z.literal('expertise'), data: expertiseSchema }),
  z.object({ step: z.literal('compliance'), data: complianceSchema }),
]);
export type ExpertStepInput = z.infer<typeof expertStepInputSchema>;

/** Business days from submission to a decision, shown on the pending page. */
export const REVIEW_BUSINESS_DAYS = 2;

export const YEAR_OPTIONS = Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR - i));

export type SectionStep = Exclude<ExpertStep, 'submit'>;
export const SECTION_STEPS: SectionStep[] = ['basics', 'work', 'expertise', 'compliance'];

export function missingSections(profile: ExpertOnboarding): SectionStep[] {
  return SECTION_STEPS.filter((step) => profile[step] === null);
}

/** Adds business days (Mon–Fri) for the "decision by" date on the pending page. */
export function addBusinessDays(from: Date, days: number): Date {
  const next = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return next;
}
