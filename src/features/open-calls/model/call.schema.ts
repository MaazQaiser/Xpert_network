import { z } from 'zod';

export const MATCH_LEVELS = ['strong', 'good', 'partial'] as const;
export const matchLevelSchema = z.enum(MATCH_LEVELS);
export type MatchLevel = z.infer<typeof matchLevelSchema>;

export const MATCH_LABELS: Record<MatchLevel, string> = {
  strong: 'Strong match',
  good: 'Good match',
  partial: 'Partial match',
};

export const INTERVIEW_MODES = ['voice_or_text', 'text', 'voice'] as const;
export const interviewModeOptionSchema = z.enum(INTERVIEW_MODES);
export type InterviewModeOption = z.infer<typeof interviewModeOptionSchema>;

export const MODE_LABELS: Record<InterviewModeOption, string> = {
  voice_or_text: 'Voice or text',
  text: 'Text only',
  voice: 'Voice only',
};

/** Why a call matches the expert: reasons, not just a number (AI_NATIVE, expert fit). */
export const callMatchSchema = z.object({
  level: matchLevelSchema,
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
});
export type CallMatch = z.infer<typeof callMatchSchema>;

export const screeningQuestionSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('yes_no'), text: z.string() }),
  z.object({
    id: z.string(),
    kind: z.literal('choice'),
    text: z.string(),
    options: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  z.object({ id: z.string(), kind: z.literal('text'), text: z.string(), hint: z.string() }),
]);
export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;

/** applied (under review) → approved (interview ready) | not_eligible. */
export const applicationStatusSchema = z.enum(['applied', 'approved', 'not_eligible']);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationSchema = z.object({
  status: applicationStatusSchema,
  at: z.string(),
  /** Why, in plain words — especially for not eligible. */
  note: z.string().nullable(),
  /** Set once approved: the interview to start. */
  interviewId: z.string().nullable(),
});
export type Application = z.infer<typeof applicationSchema>;

export const callQuestionSchema = z.object({
  id: z.string(),
  /** Section the question belongs to, shown above it in the one-to-one session. */
  section: z.string(),
  text: z.string(),
});
export type CallQuestion = z.infer<typeof callQuestionSchema>;

export const openCallSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** What the client wants to learn, written for experts; the client stays anonymous. */
  brief: z.string(),
  industry: z.object({ id: z.string(), label: z.string() }),
  regions: z.array(z.object({ id: z.string(), label: z.string() })),
  topics: z.array(z.string()),
  /** Guide questions, one at a time in the one-to-one session. */
  questions: z.array(callQuestionSchema),
  /** Companies the interview covers; used for conflict checks. */
  companiesInScope: z.array(z.string()),
  feeUsd: z.number().int().positive(),
  estMinutes: z.number().int().positive(),
  deadline: z.string().nullable(),
  mode: interviewModeOptionSchema,
  /** Always open, no deadline (e.g. library refresh topics). */
  evergreen: z.boolean(),
  spotsLeft: z.number().int().min(0),
  sections: z.array(z.object({ id: z.string(), title: z.string() })),
  screening: z.array(screeningQuestionSchema),
  match: callMatchSchema,
  publishedAt: z.string(),
  application: applicationSchema.nullable(),
});
export type OpenCall = z.infer<typeof openCallSchema>;

export const screeningAnswersSchema = z.record(z.string(), z.string());

/** Builds the form schema from the call's own questions, so every one must be answered. */
export function screeningFormSchema(questions: ScreeningQuestion[]) {
  return z.object(
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        q.kind === 'text'
          ? z
              .string()
              .trim()
              .min(20, 'Add a sentence or two (20 characters or more).')
              .max(600, 'Keep it under 600 characters.')
          : z.string().min(1, 'Choose an answer.'),
      ]),
    ),
  );
}

export const applyInputSchema = z.object({ answers: screeningAnswersSchema });
export type ApplyInput = z.infer<typeof applyInputSchema>;

/** Filters live in the URL (UX_PRINCIPLES, tables): `?industry=&region=&minFee=&maxMinutes=`. */
export type CallFilters = {
  industry: string | null;
  region: string | null;
  minFee: number | null;
  maxMinutes: number | null;
};

export const FEE_FLOORS = [150, 200, 250, 300] as const;
export const TIME_CAPS = [30, 45, 60] as const;

export function filtersFromParams(params: URLSearchParams): CallFilters {
  const num = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  return {
    industry: params.get('industry') || null,
    region: params.get('region') || null,
    minFee: num('minFee'),
    maxMinutes: num('maxMinutes'),
  };
}

export function filtersToParams(filters: CallFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.industry) params.set('industry', filters.industry);
  if (filters.region) params.set('region', filters.region);
  if (filters.minFee) params.set('minFee', String(filters.minFee));
  if (filters.maxMinutes) params.set('maxMinutes', String(filters.maxMinutes));
  return params;
}

export function hasCallFilters(filters: CallFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

export function matchesCallFilters(call: OpenCall, filters: CallFilters): boolean {
  if (filters.industry && call.industry.id !== filters.industry) return false;
  if (filters.region && !call.regions.some((r) => r.id === filters.region)) return false;
  if (filters.minFee && call.feeUsd < filters.minFee) return false;
  if (filters.maxMinutes && call.estMinutes > filters.maxMinutes) return false;
  return true;
}

/** Strongest match first; evergreen calls after dated ones of the same strength. */
export function sortCalls(calls: OpenCall[]): OpenCall[] {
  return [...calls].sort(
    (a, b) => b.match.score - a.match.score || Number(a.evergreen) - Number(b.evergreen),
  );
}
