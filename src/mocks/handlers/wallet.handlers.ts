import { http, HttpResponse } from 'msw';
import { topUpInputSchema, type Wallet } from '@/features/wallet';
import { createId } from '@/shared/lib/id';
import { getControls, setControls } from '../controls';
import { CREDIT_PACKS } from '../fixtures/wallet';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const LOW_CREDITS_BALANCE = 15;

/** The wallet as the client sees it; "Low credits" caps the balance for the demo. */
export function effectiveWallet(userId: string): Wallet {
  const wallet = db.get().wallets[userId] ?? { balance: 0, held: 0, transactions: [] };
  return getControls().lowCredits
    ? { ...wallet, balance: Math.min(wallet.balance, LOW_CREDITS_BALANCE) }
    : wallet;
}

export const walletHandlers = [
  http.get('/api/wallet', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const wallet = effectiveWallet(user.id);
    // "Empty data" shows a brand-new wallet's history.
    return HttpResponse.json(getControls().emptyData ? { ...wallet, transactions: [] } : wallet);
  }),

  http.get('/api/wallet/packs', async () => {
    await simulateNetwork();
    return HttpResponse.json(CREDIT_PACKS);
  }),

  http.post('/api/wallet/top-up', async ({ request }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const parsed = topUpInputSchema.safeParse(await request.json());
    const pack = CREDIT_PACKS.find((p) => p.id === parsed.data?.packId);
    if (!pack) return errorResponse(422, 'invalid_pack', 'Choose a credit pack to continue.');
    // Topping up ends the "low credits" demo state so the new balance is visible.
    if (getControls().lowCredits) {
      db.update((draft) => {
        const wallet = draft.wallets[user.id];
        if (wallet) wallet.balance = Math.min(wallet.balance, LOW_CREDITS_BALANCE);
      });
      setControls({ lowCredits: false });
    }
    db.update((draft) => {
      const wallet = draft.wallets[user.id];
      if (!wallet) return;
      wallet.balance += pack.credits;
      wallet.transactions.unshift({
        id: createId('txn'),
        type: 'top_up',
        amount: pack.credits,
        description: `${pack.label} pack · ${pack.credits} credits`,
        at: new Date().toISOString(),
      });
    });
    return HttpResponse.json(effectiveWallet(user.id));
  }),
];
