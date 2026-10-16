import { z } from 'zod';

export const interviewModeSchema = z.enum(['voice', 'text']);
export type InterviewMode = z.infer<typeof interviewModeSchema>;

/**
 * ready (pre-flight) → in_progress ⇄ paused → review → submitted → accepted | rejected.
 * Ending early goes to review with `endedEarly`.
 */
export const interviewStatusSchema = z.enum([
  'ready',
  'in_progress',
  'paused',
  'review',
  'submitted',
  'accepted',
  'rejected',
]);
export type InterviewStatus = z.infer<typeof interviewStatusSchema>;

export const sectionStatusSchema = z.enum(['todo', 'active', 'done', 'skipped']);
export type SectionStatus = z.infer<typeof sectionStatusSchema>;

export const interviewSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: sectionStatusSchema,
  /** Questions answered or skipped in this section, out of its total. */
  answered: z.number().int().min(0),
  total: z.number().int().min(1),
});
export type InterviewSection = z.infer<typeof interviewSectionSchema>;

export const TRANSCRIPT_KINDS = [
  'greeting',
  'question',
  'follow_up',
  'deflection',
  'acknowledgement',
  'section_complete',
  'answer',
  'skipped',
  'confidential',
  'removed',
] as const;

export const transcriptEntrySchema = z.object({
  id: z.string(),
  speaker: z.enum(['ai', 'expert']),
  kind: z.enum(TRANSCRIPT_KINDS),
  text: z.string(),
  sectionId: z.string(),
  at: z.string(),
});
export type TranscriptEntry = z.infer<typeof transcriptEntrySchema>;

export const sectionSummarySchema = z.object({
  sectionId: z.string(),
  /** The AI's draft, kept so an edit can be reverted (AI_NATIVE §5). */
  aiText: z.string(),
  text: z.string(),
  isEdited: z.boolean(),
});
export type SectionSummary = z.infer<typeof sectionSummarySchema>;

export const interviewSchema = z.object({
  id: z.string(),
  callId: z.string(),
  callTitle: z.string(),
  topic: z.string(),
  feeUsd: z.number().int(),
  estMinutes: z.number().int(),
  /** What the call allows; the expert picks one in pre-flight. */
  allowedModes: z.array(interviewModeSchema).min(1),
  mode: interviewModeSchema.nullable(),
  language: z.string(),
  status: interviewStatusSchema,
  sections: z.array(interviewSectionSchema),
  transcript: z.array(transcriptEntrySchema),
  summaries: z.array(sectionSummarySchema),
  endedEarly: z.boolean(),
  startedAt: z.string().nullable(),
  /** Seconds spent in the room before the current stretch (pauses don't count). */
  elapsedSeconds: z.number().int().min(0),
  pausedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
});
export type Interview = z.infer<typeof interviewSchema>;

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'Arabic' },
] as const;

export const preflightSchema = z.object({
  mode: interviewModeSchema,
  language: z.enum(['en', 'ar']),
  acceptCompliance: z
    .boolean()
    .refine((v) => v, 'Confirm you won’t share confidential or non-public information.'),
});
export type PreflightInput = z.infer<typeof preflightSchema>;

export const TURN_ACTIONS = ['answer', 'skip', 'confidential'] as const;
export const turnInputSchema = z.object({
  turnId: z.string(),
  action: z.enum(TURN_ACTIONS),
  /** The answer, or the reason for skipping. */
  text: z.string().max(4000),
});
export type TurnInput = z.infer<typeof turnInputSchema>;

export const turnResultSchema = z.object({ interview: interviewSchema });
export type TurnResult = z.infer<typeof turnResultSchema>;

export const SKIP_REASONS = [
  'I don’t know enough about this',
  'It’s outside my experience',
  'I’d rather not say',
] as const;

export const summaryEditSchema = z.object({
  sectionId: z.string(),
  text: z
    .string()
    .trim()
    .min(10, 'Keep at least a sentence.')
    .max(2000, 'Keep it under 2,000 characters.'),
});

export function progressPercent(interview: Pick<Interview, 'sections'>): number {
  const total = interview.sections.reduce((sum, s) => sum + s.total, 0);
  const done = interview.sections.reduce((sum, s) => sum + Math.min(s.answered, s.total), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export function activeSection(interview: Pick<Interview, 'sections'>): InterviewSection | null {
  return interview.sections.find((s) => s.status === 'active') ?? null;
}

/** Ten minutes paused shows a “still there?” notice (plan F9 states). */
export const LONG_PAUSE_MS = 10 * 60 * 1000;

export function isLongPause(interview: Pick<Interview, 'pausedAt'>, now = Date.now()): boolean {
  return Boolean(
    interview.pausedAt && now - new Date(interview.pausedAt).getTime() > LONG_PAUSE_MS,
  );
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
