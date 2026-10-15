import type { CreditPack, Wallet } from '@/features/wallet';
import { LIBRARY_ITEMS } from './library';

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_200', credits: 200, label: 'Starter', isPopular: false },
  { id: 'pack_500', credits: 500, label: 'Team', isPopular: true },
  { id: 'pack_1500', credits: 1500, label: 'Research desk', isPopular: false },
];

/** Each client starts with a recent top-up and one owned report. */
export const SEED_OWNED_REPORTS: Record<string, string[]> = {
  usr_ayesha: ['lib_uae_retail'],
  usr_bilal: ['lib_dubai_rents'],
};

export function seedWallet(userId: string): Wallet {
  const owned = (SEED_OWNED_REPORTS[userId] ?? [])
    .map((id) => LIBRARY_ITEMS.find((item) => item.id === id))
    .filter((item) => item !== undefined);
  const spent = owned.reduce((sum, item) => sum + item.priceCredits, 0);
  return {
    balance: 500 - spent,
    held: 0,
    transactions: [
      {
        id: 'txn_seed_topup',
        type: 'top_up',
        amount: 500,
        description: 'Team pack · 500 credits',
        at: '2026-09-28T09:12:00.000Z',
      },
      ...owned.map((item, index) => ({
        id: `txn_seed_${index}`,
        type: 'purchase' as const,
        amount: -item.priceCredits,
        description: item.title,
        at: '2026-10-02T14:40:00.000Z',
      })),
    ],
  };
}
