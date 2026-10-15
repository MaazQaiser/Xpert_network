import { z } from 'zod';
import {
  constraintsSchema,
  goalTypeSchema,
  questionSchema,
  researchBriefSchema,
  researchOptionSchema,
  subjectSchema,
} from './brief.schema';
import { chatMessageSchema } from './message.schema';
import { stepIdSchema } from './steps';

/** What the client sends for one conversational turn. */
export const turnActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start') }),
  z.object({ kind: z.literal('text'), text: z.string().min(1) }),
  z.object({ kind: z.literal('goal-type'), goalType: goalTypeSchema }),
  z.object({ kind: z.literal('subject-add'), subject: subjectSchema }),
  z.object({ kind: z.literal('subject-remove'), subjectId: z.string() }),
  z.object({ kind: z.literal('subjects-done') }),
  z.object({ kind: z.literal('questions'), questions: z.array(questionSchema) }),
  z.object({ kind: z.literal('constraints'), constraints: constraintsSchema }),
  z.object({ kind: z.literal('skip'), step: stepIdSchema }),
  z.object({ kind: z.literal('confirm-needs') }),
  z.object({ kind: z.literal('choose-option'), option: researchOptionSchema }),
  z.object({ kind: z.literal('revisit'), step: stepIdSchema }),
]);
export type TurnAction = z.infer<typeof turnActionSchema>;

export const turnInputSchema = z.object({
  /** Client-generated id: retries of the same turn are idempotent. */
  turnId: z.string(),
  action: turnActionSchema,
});
export type TurnInput = z.infer<typeof turnInputSchema>;

export const turnResultSchema = z.object({
  brief: researchBriefSchema,
  userMessage: chatMessageSchema.nullable(),
  assistantMessage: chatMessageSchema,
});
export type TurnResult = z.infer<typeof turnResultSchema>;

export const conversationSchema = z.object({
  brief: researchBriefSchema,
  messages: z.array(chatMessageSchema),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const checkoutInputSchema = z.object({
  option: researchOptionSchema,
  reportIds: z.array(z.string()),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const checkoutResultSchema = z.object({
  brief: researchBriefSchema,
  assistantMessage: chatMessageSchema,
  purchasedReportIds: z.array(z.string()),
  requestId: z.string().nullable(),
});
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
