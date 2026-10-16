import type { Earning, Payout, PayoutMethod } from '@/features/earnings';

export type StoredEarnings = { items: Earning[]; payouts: Payout[]; method: PayoutMethod | null };

const METHOD: PayoutMethod = {
  kind: 'bank',
  label: 'Bank transfer · IBAN ending 3456',
  holder: 'Sara Al-Mansouri',
};

/** Sara's history: two paid interviews, one approved and waiting for a payout. */
export const SEED_EARNINGS: Record<string, StoredEarnings> = {
  usr_sara: {
    method: METHOD,
    items: [
      {
        id: 'ern_seed_1',
        interviewId: null,
        title: 'Dairy import lead times into the UAE',
        feeUsd: 250,
        status: 'paid',
        submittedAt: '2026-08-21T10:00:00.000Z',
        decidedAt: '2026-08-22T09:30:00.000Z',
        paidAt: '2026-09-01T08:00:00.000Z',
        note: null,
      },
      {
        id: 'ern_seed_2',
        interviewId: null,
        title: 'Bakery supplier consolidation in the GCC',
        feeUsd: 300,
        status: 'paid',
        submittedAt: '2026-09-03T14:00:00.000Z',
        decidedAt: '2026-09-04T11:00:00.000Z',
        paidAt: '2026-09-15T08:00:00.000Z',
        note: null,
      },
      {
        id: 'ern_seed_3',
        interviewId: null,
        title: 'Coffee roaster capacity in Riyadh',
        feeUsd: 200,
        status: 'approved',
        submittedAt: '2026-10-06T16:00:00.000Z',
        decidedAt: '2026-10-07T10:00:00.000Z',
        paidAt: null,
        note: null,
      },
    ],
    payouts: [
      {
        id: 'pay_seed_1',
        amountUsd: 550,
        status: 'paid',
        requestedAt: '2026-09-14T09:00:00.000Z',
        paidAt: '2026-09-15T08:00:00.000Z',
        methodLabel: METHOD.label,
      },
    ],
  },
};
