import { z } from 'zod';
import { scheduleColourSchema } from './schedule.schema';

/** Who said a line: the client, the expert, or Umer moderating. */
export const callSpeakerSchema = z.enum(['client', 'expert', 'pm']);
export type CallSpeaker = z.infer<typeof callSpeakerSchema>;

const callPersonSchema = z.object({
  name: z.string(),
  /** The client's company, or the expert's role. */
  detail: z.string(),
  photoUrl: z.string().nullable(),
  /** Their camera on the call (a looping clip in the prototype); null when there's none. */
  videoUrl: z.string().nullable(),
});

/**
 * One call on the Calls page. Upcoming calls carry the Meet link and briefing; live and
 * completed calls carry the record the AI keeps (transcript, summary, follow-ups).
 */
export const callRecordSchema = z.object({
  id: z.string(),
  status: z.enum(['upcoming', 'live', 'completed']),
  projectId: z.string(),
  projectName: z.string(),
  /** The industry the project is in, e.g. "Industrial automation". */
  industry: z.string(),
  colour: scheduleColourSchema,
  client: callPersonSchema,
  expert: callPersonSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  meetUrl: z.string().url(),
  /** The briefing pack goes to the expert 24 hours before. */
  briefingSent: z.boolean(),
  questionCount: z.number().int().nonnegative(),
  /** How many of the client's questions the call covered (live: so far). */
  questionsCovered: z.number().int().nonnegative(),
  /** Follow-ups the AI found that haven't gone out yet. */
  followUpsOpen: z.number().int().nonnegative(),
  followUpsSentAt: z.string().nullable(),
});
export type CallRecord = z.infer<typeof callRecordSchema>;

export const callLineSchema = z.object({
  id: z.string(),
  /** Seconds from the start of the call. */
  at: z.number().int().nonnegative(),
  speaker: callSpeakerSchema,
  text: z.string(),
});
export type CallLine = z.infer<typeof callLineSchema>;

/** The full record of one call, for its review page. */
export const callDetailSchema = callRecordSchema.extend({
  /** Umer, who runs the call. */
  moderator: callPersonSchema,
  purpose: z.string(),
  takeaways: z.array(z.string()),
  /** The client's questions and whether the call answered each. */
  questions: z.array(
    z.object({
      text: z.string(),
      covered: z.boolean(),
      /** What the expert said to it, for the report; null until it's covered. */
      answer: z.string().nullable(),
      /** Where in the call they said it (seconds). */
      at: z.number().nullable(),
    }),
  ),
  nextSteps: z.array(
    z.object({ id: z.string(), text: z.string(), owner: z.string(), at: z.number().int() }),
  ),
  /** Chapters on the recording. */
  moments: z.array(z.object({ at: z.number().int(), title: z.string() })),
  transcript: z.array(callLineSchema),
  /** What the client asked for during the call. */
  requests: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['document', 'remove_requirement', 'new_requirement']),
      text: z.string(),
      at: z.number().int(),
    }),
  ),
  email: z.object({ to: z.string(), toEmail: z.string(), subject: z.string(), body: z.string() }),
});
export type CallDetail = z.infer<typeof callDetailSchema>;
