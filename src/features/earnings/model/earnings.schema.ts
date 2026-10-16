import { z } from 'zod';

/** pending (under review) → approved (available to pay out) → paid; or rejected. */
export const earningStatusSchema = z.enum(['pending', 'approved', 'paid', 'rejected']);
export type EarningStatus = z.infer<typeof earningStatusSchema>;

export const EARNING_STATUS_LABELS: Record<EarningStatus, string> = {
  pending: 'Under review',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Not accepted',
};

export const earningSchema = z.object({
  id: z.string(),
  interviewId: z.string().nullable(),
  title: z.string(),
  feeUsd: z.number().int(),
  status: earningStatusSchema,
  submittedAt: z.string(),
  decidedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  note: z.string().nullable(),
});
export type Earning = z.infer<typeof earningSchema>;

export const payoutMethodSchema = z.object({
  kind: z.enum(['bank', 'paypal']),
  /** What we show back, never the full number: “Bank transfer · IBAN ending 3456”. */
  label: z.string(),
  holder: z.string(),
});
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

export const payoutSchema = z.object({
  id: z.string(),
  amountUsd: z.number().int(),
  status: z.enum(['requested', 'paid']),
  requestedAt: z.string(),
  paidAt: z.string().nullable(),
  methodLabel: z.string(),
});
export type Payout = z.infer<typeof payoutSchema>;

export const earningsSchema = z.object({
  totals: z.object({
    pendingUsd: z.number().int(),
    availableUsd: z.number().int(),
    requestedUsd: z.number().int(),
    paidUsd: z.number().int(),
  }),
  items: z.array(earningSchema),
  payouts: z.array(payoutSchema),
  method: payoutMethodSchema.nullable(),
  minPayoutUsd: z.number().int(),
});
export type Earnings = z.infer<typeof earningsSchema>;

/** IBANs: 2 letters, 2 digits, then 11–30 letters or digits (spaces allowed while typing). */
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export const payoutMethodInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('bank'),
    holder: z.string().trim().min(2, 'Enter the account holder’s name.').max(80),
    iban: z
      .string()
      .transform((v) => v.replace(/\s+/g, '').toUpperCase())
      .refine((v) => IBAN_PATTERN.test(v), 'Enter an IBAN like AE07 0331 2345 6789 0123 456.'),
  }),
  z.object({
    kind: z.literal('paypal'),
    holder: z.string().trim().min(2, 'Enter the account holder’s name.').max(80),
    email: z.string().trim().email('Enter the email address of your PayPal account.'),
  }),
]);
export type PayoutMethodInput = z.input<typeof payoutMethodInputSchema>;

/** The payout-method form: one set of fields, checked against the chosen method. */
export const payoutMethodFormSchema = z
  .object({
    kind: z.enum(['bank', 'paypal']),
    holder: z.string().trim().min(2, 'Enter the account holder’s name.').max(80),
    iban: z.string(),
    email: z.string(),
  })
  .superRefine((values, ctx) => {
    const parsed = payoutMethodInputSchema.safeParse(toPayoutMethodInput(values));
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'iban' || field === 'email')
        ctx.addIssue({ code: 'custom', path: [field], message: issue.message });
    }
  });
export type PayoutMethodForm = z.infer<typeof payoutMethodFormSchema>;

export function toPayoutMethodInput(values: PayoutMethodForm): PayoutMethodInput {
  return values.kind === 'bank'
    ? { kind: 'bank', holder: values.holder, iban: values.iban }
    : { kind: 'paypal', holder: values.holder, email: values.email };
}

export const MIN_PAYOUT_USD = 100;
