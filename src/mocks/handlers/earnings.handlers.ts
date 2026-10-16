import { http, HttpResponse } from 'msw';
import { MIN_PAYOUT_USD, payoutMethodInputSchema, type Earnings } from '@/features/earnings';
import { createId } from '@/shared/lib/id';
import { getControls } from '../controls';
import type { StoredEarnings } from '../fixtures/earnings';
import { db } from '../store/db';
import { notifyUser } from './notify';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const EMPTY: StoredEarnings = { items: [], payouts: [], method: null };

function sum(values: number[]) {
  return values.reduce((total, v) => total + v, 0);
}

export function earningsFor(userId: string): Earnings {
  const stored = getControls().emptyData ? EMPTY : (db.get().earnings[userId] ?? EMPTY);
  const requestedIds = new Set(
    stored.payouts.filter((p) => p.status === 'requested').map((p) => p.id),
  );
  const by = (status: string) => stored.items.filter((i) => i.status === status);
  const requested = sum(
    stored.payouts.filter((p) => requestedIds.has(p.id)).map((p) => p.amountUsd),
  );
  return {
    totals: {
      pendingUsd: sum(by('pending').map((i) => i.feeUsd)),
      availableUsd: Math.max(0, sum(by('approved').map((i) => i.feeUsd)) - requested),
      requestedUsd: requested,
      paidUsd: sum(by('paid').map((i) => i.feeUsd)),
    },
    items: stored.items,
    payouts: stored.payouts,
    method: stored.method,
    minPayoutUsd: MIN_PAYOUT_USD,
  };
}

function expert() {
  const user = currentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== 'expert')
    return { error: errorResponse(403, 'forbidden', 'Earnings are for experts.') };
  const failure = injectedError();
  if (failure) return { error: failure };
  return { user };
}

export const earningsHandlers = [
  http.get('/api/earnings', async () => {
    await simulateNetwork();
    const { user, error } = expert();
    if (error) return error;
    return HttpResponse.json(earningsFor(user.id));
  }),

  http.put('/api/earnings/method', async ({ request }) => {
    await simulateNetwork();
    const { user, error } = expert();
    if (error) return error;
    const parsed = payoutMethodInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        422,
        'invalid',
        parsed.error.issues[0]?.message ?? 'Check the payout details.',
      );
    }
    // Only a masked label is kept, as a real payments provider would return.
    const method =
      parsed.data.kind === 'bank'
        ? {
            kind: 'bank' as const,
            label: `Bank transfer · IBAN ending ${parsed.data.iban.slice(-4)}`,
            holder: parsed.data.holder,
          }
        : {
            kind: 'paypal' as const,
            label: `PayPal · ${parsed.data.email.replace(/^(.).*(@.*)$/, '$1•••$2')}`,
            holder: parsed.data.holder,
          };
    db.update((draft) => {
      draft.earnings[user.id] = { ...(draft.earnings[user.id] ?? EMPTY), method };
    });
    return HttpResponse.json(earningsFor(user.id));
  }),

  http.post('/api/earnings/payouts', async () => {
    await simulateNetwork();
    const { user, error } = expert();
    if (error) return error;
    const current = earningsFor(user.id);
    if (!current.method) return errorResponse(409, 'no_method', 'Add a payout method first.');
    if (current.totals.availableUsd < MIN_PAYOUT_USD) {
      return errorResponse(
        409,
        'below_minimum',
        `You can request a payout once you have $${MIN_PAYOUT_USD} approved.`,
      );
    }
    db.update((draft) => {
      const earnings = draft.earnings[user.id];
      if (!earnings || !current.method) return;
      earnings.payouts.unshift({
        id: createId('pay'),
        amountUsd: current.totals.availableUsd,
        status: 'requested',
        requestedAt: new Date().toISOString(),
        paidAt: null,
        methodLabel: current.method.label,
      });
    });
    return HttpResponse.json(earningsFor(user.id));
  }),
];

/** Toolbar: the oldest requested payout is sent, and the approved fees it covered become paid. */
export function payOldestPayout(userId: string): boolean {
  const earnings = db.get().earnings[userId];
  const payout = earnings?.payouts.filter((p) => p.status === 'requested').at(-1);
  if (!earnings || !payout) return false;
  const at = new Date().toISOString();
  db.update((draft) => {
    const stored = draft.earnings[userId];
    if (!stored) return;
    const target = stored.payouts.find((p) => p.id === payout.id);
    if (target) Object.assign(target, { status: 'paid', paidAt: at });
    let left = payout.amountUsd;
    for (const item of [...stored.items].reverse()) {
      if (item.status === 'approved' && item.feeUsd <= left) {
        left -= item.feeUsd;
        Object.assign(item, { status: 'paid', paidAt: at });
      }
    }
  });
  notifyUser(userId, {
    event: 'payout_update',
    title: 'Payout sent',
    body: `$${payout.amountUsd} is on its way to ${payout.methodLabel}. It usually arrives in 1–3 working days.`,
    href: '/expert/earnings',
  });
  return true;
}
