import { z } from 'zod';

/**
 * Wire protocol for streamed AI output (AI_NATIVE.md §6): newline-delimited JSON events.
 * `step` = agentic progress ("Searching library…"), `token` = streamed text,
 * `done` = the validated structured result, `error` = a user-safe failure.
 */
export const aiStepEventSchema = z.object({ type: z.literal('step'), label: z.string() });
export const aiTokenEventSchema = z.object({ type: z.literal('token'), text: z.string() });
export const aiErrorEventSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export function aiStreamEventSchema<TResult extends z.ZodType>(result: TResult) {
  return z.discriminatedUnion('type', [
    aiStepEventSchema,
    aiTokenEventSchema,
    aiErrorEventSchema,
    z.object({ type: z.literal('done'), result }),
  ]);
}

export type AIStreamEvent<TResult> =
  | z.infer<typeof aiStepEventSchema>
  | z.infer<typeof aiTokenEventSchema>
  | z.infer<typeof aiErrorEventSchema>
  | { type: 'done'; result: TResult };
