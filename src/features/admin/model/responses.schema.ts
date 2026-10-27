import { z } from 'zod';
import { expertOriginSchema } from './match.schema';

/** Where an expert is with the screening questions (screen 08). */
export const responseStatusSchema = z.enum(['answered', 'in_progress', 'not_opened', 'declined']);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  answered: 'Answered',
  in_progress: 'In progress',
  not_opened: 'Not opened',
  declined: 'Declined',
};

/** The AI's read of how useful an expert's answers are. */
export const answerQualitySchema = z.enum(['strong', 'good', 'weak']);
export type AnswerQuality = z.infer<typeof answerQualitySchema>;

export const ANSWER_QUALITY_LABELS: Record<AnswerQuality, string> = {
  strong: 'Strong',
  good: 'Good',
  weak: 'Weak',
};

export const screeningAnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  /** Null when the expert skipped it or hasn't reached it yet. */
  answer: z.string().nullable(),
});
export type ScreeningAnswer = z.infer<typeof screeningAnswerSchema>;

export const expertResponseSchema = z.object({
  expertId: z.string(),
  label: z.string(),
  role: z.string(),
  /** Who they are, for the PM only (clients see "Expert A"). */
  name: z.string().optional(),
  years: z.number().int().nonnegative().optional(),
  country: z.string().min(2).max(2).optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  /** Portrait for the report panel. */
  photoUrl: z.string().optional(),
  /** Where the AI found them. */
  source: expertOriginSchema.optional(),
  status: responseStatusSchema,
  answeredCount: z.number().int().nonnegative(),
  quality: answerQualitySchema.nullable(),
  /** 0–100, for the quality meter. Null until answered. */
  qualityScore: z.number().min(0).max(100).nullable(),
  /** The AI suggests moving this expert forward. */
  aiPick: z.boolean(),
  submittedAt: z.string().nullable(),
  /** One-sentence AI summary of the answers. Null until answered. */
  summary: z.string().nullable(),
  answers: z.array(screeningAnswerSchema),
});
export type ExpertResponse = z.infer<typeof expertResponseSchema>;

export const responsesSchema = z.object({
  projectId: z.string(),
  /** When the screening questions first went out; null if none were sent. */
  sentAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  questionCount: z.number().int().nonnegative(),
  /** Why the AI picked who it picked. */
  aiNote: z.string().nullable(),
  responses: z.array(expertResponseSchema),
});
export type ResponsesResult = z.infer<typeof responsesSchema>;

export const nudgeResultSchema = z.object({ nudged: z.number().int().nonnegative() });
