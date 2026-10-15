import type { CreditPack, Transaction, Wallet } from '@/features/wallet';
import { LIBRARY_ITEMS } from './library';

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_200', credits: 200, label: 'Starter', isPopular: false },
  { id: 'pack_500', credits: 500, label: 'Team', isPopular: true },
  { id: 'pack_1500', credits: 1500, label: 'Research desk', isPopular: false },
];

/** Fallback purchase time for an owned report with no recorded purchase. */
export const SEED_PURCHASED_AT = '2026-10-02T14:40:00.000Z';

/** Reports each demo client already owns, and when they bought them. */
export const SEED_PURCHASES: Record<string, { itemId: string; at: string }[]> = {
  usr_ayesha: [
    { itemId: 'lib_gcc_coffee_2026', at: '2026-08-18T10:05:00.000Z' },
    { itemId: 'lib_uae_retail', at: SEED_PURCHASED_AT },
  ],
  usr_bilal: [{ itemId: 'lib_dubai_rents', at: SEED_PURCHASED_AT }],
};

export const SEED_OWNED_REPORTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SEED_PURCHASES).map(([userId, purchases]) => [
    userId,
    purchases.map((p) => p.itemId),
  ]),
);

const SEED_TOP_UPS: Record<string, { packId: string; at: string }[]> = {
  usr_ayesha: [
    { packId: 'pack_200', at: '2026-08-15T08:30:00.000Z' },
    { packId: 'pack_500', at: '2026-09-28T09:12:00.000Z' },
  ],
  usr_bilal: [{ packId: 'pack_500', at: '2026-09-28T09:12:00.000Z' }],
};

/** A client's wallet as the sum of their seeded top-ups and purchases (newest first). */
export function seedWallet(userId: string): Wallet {
  const topUps: Transaction[] = (SEED_TOP_UPS[userId] ?? []).flatMap(({ packId, at }, index) => {
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    return pack
      ? [
          {
            id: `txn_seed_topup_${index}`,
            type: 'top_up' as const,
            amount: pack.credits,
            description: `${pack.label} pack · ${pack.credits} credits`,
            at,
          },
        ]
      : [];
  });
  const purchases: Transaction[] = (SEED_PURCHASES[userId] ?? []).flatMap(
    ({ itemId, at }, index) => {
      const item = LIBRARY_ITEMS.find((i) => i.id === itemId);
      return item
        ? [
            {
              id: `txn_seed_purchase_${index}`,
              type: 'purchase' as const,
              amount: -item.priceCredits,
              description: item.title,
              at,
            },
          ]
        : [];
    },
  );
  const transactions = [...topUps, ...purchases].sort((a, b) => b.at.localeCompare(a.at));
  return {
    balance: transactions.reduce((sum, t) => sum + t.amount, 0),
    held: 0,
    transactions,
  };
}
