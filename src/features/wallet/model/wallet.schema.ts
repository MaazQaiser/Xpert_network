import { z } from 'zod';

export const transactionTypeSchema = z.enum(['purchase', 'top_up', 'hold', 'spent', 'refund']);

export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  /** Positive adds to the balance, negative removes from it. */
  amount: z.number().int(),
  description: z.string(),
  at: z.string(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const walletSchema = z.object({
  balance: z.number().int().min(0),
  /** Credits reserved by accepted quotes; not spendable, not yet spent. */
  held: z.number().int().min(0),
  transactions: z.array(transactionSchema),
});
export type Wallet = z.infer<typeof walletSchema>;

export const creditPackSchema = z.object({
  id: z.string(),
  credits: z.number().int().positive(),
  label: z.string(),
  isPopular: z.boolean(),
});
export type CreditPack = z.infer<typeof creditPackSchema>;

export const topUpInputSchema = z.object({ packId: z.string() });
export type TopUpInput = z.infer<typeof topUpInputSchema>;

/** Below this the app shows the low-balance banner (F6). */
export const LOW_BALANCE_THRESHOLD = 50;
