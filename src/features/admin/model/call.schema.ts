import { z } from 'zod';

/** Screen 14: the live call workspace (scripted transcript, AI-detected client requests). */
export const speakerSchema = z.enum(['client', 'expert', 'moderator']);
export type Speaker = z.infer<typeof speakerSchema>;

export const transcriptLineSchema = z.object({
  id: z.string(),
  /** Seconds since the call started. */
  at: z.number().int().nonnegative(),
  speaker: speakerSchema,
  text: z.string(),
  /** The part of the line the AI read as a client request, underlined in the transcript. */
  highlight: z.string().nullable(),
  /** Indexes of the client's questions this line answers. */
  covers: z.array(z.number().int().nonnegative()),
});
export type TranscriptLine = z.infer<typeof transcriptLineSchema>;

export const callRequestKindSchema = z.enum(['document', 'remove_requirement', 'new_requirement']);
export type CallRequestKind = z.infer<typeof callRequestKindSchema>;

export const callRequestStatusSchema = z.enum(['open', 'accepted', 'dismissed']);
export type CallRequestStatus = z.infer<typeof callRequestStatusSchema>;

export const callRequestSchema = z.object({
  id: z.string(),
  kind: callRequestKindSchema,
  at: z.number().int().nonnegative(),
  /** The line the request came from. */
  lineId: z.string(),
  quote: z.string(),
  /** Document request: what to send. */
  documents: z.array(z.string()),
  /** Remove requirement: the question to drop. */
  questionIndex: z.number().int().nonnegative().nullable(),
  /** New requirement: how many experts the AI found, and who. */
  matches: z.number().int().nonnegative().nullable(),
  matchNote: z.string().nullable(),
  status: callRequestStatusSchema,
});
export type CallRequest = z.infer<typeof callRequestSchema>;

export const callNoteSchema = z.object({ id: z.string(), at: z.number().int(), text: z.string() });
export type CallNote = z.infer<typeof callNoteSchema>;

export const callSessionSchema = z.object({
  projectId: z.string(),
  client: z.object({ name: z.string() }),
  expert: z.object({
    expertId: z.string(),
    name: z.string(),
    letter: z.string(),
    photoUrl: z.string().nullable(),
  }),
  /** Where the transcript picks up (the call has been running a while). */
  startAt: z.number().int().nonnegative(),
  lines: z.array(transcriptLineSchema),
  /** The expert is still talking after the last line. */
  speakingAfter: speakerSchema.nullable(),
  requests: z.array(callRequestSchema),
  questionTopics: z.array(z.string()),
  /** Questions answered before the transcript picks up. */
  coveredBefore: z.array(z.number().int().nonnegative()),
  notes: z.array(callNoteSchema),
  endedAt: z.string().nullable(),
  /** Call length when it ended, in seconds. */
  duration: z.number().int().nonnegative().nullable(),
  sentToClientAt: z.string().nullable(),
  expertPaidAt: z.string().nullable(),
  version: z.string(),
});
export type CallSession = z.infer<typeof callSessionSchema>;

export const callActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('resolve'),
    requestId: z.string(),
    status: z.enum(['accepted', 'dismissed']),
  }),
  z.object({
    action: z.literal('note'),
    at: z.number().int().nonnegative(),
    text: z.string().trim().min(1, 'Write a note.').max(500, 'Keep notes under 500 characters.'),
  }),
  z.object({ action: z.literal('end'), duration: z.number().int().nonnegative() }),
  z.object({ action: z.literal('send_all') }),
  z.object({ action: z.literal('mark_paid') }),
]);
export type CallAction = z.infer<typeof callActionSchema>;
