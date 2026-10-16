import { describe, expect, it } from 'vitest';
import type { Earnings } from '@/features/earnings';
import { db, scenarios } from '@/test/mockBackend';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Earnings & { message?: string },
  };
}

describe('earnings mock API (F10)', () => {
  it('totals pending, available and paid fees', async () => {
    logIn('usr_sara');
    const { body } = await call('GET', '/api/earnings');
    expect(body.totals).toEqual({
      pendingUsd: 0,
      availableUsd: 200,
      requestedUsd: 0,
      paidUsd: 550,
    });
    expect(body.method?.label).toBe('Bank transfer · IBAN ending 3456');
  });

  it('requests a payout of everything available, then pays it from the toolbar', async () => {
    logIn('usr_sara');
    const requested = (await call('POST', '/api/earnings/payouts')).body;
    expect(requested.totals).toMatchObject({ availableUsd: 0, requestedUsd: 200 });
    expect((await call('POST', '/api/earnings/payouts')).status).toBe(409);

    expect(scenarios.payoutPaid()).toBe(true);
    const paid = (await call('GET', '/api/earnings')).body;
    expect(paid.totals).toMatchObject({ requestedUsd: 0, paidUsd: 750 });
    expect(paid.payouts[0]).toMatchObject({ status: 'paid', amountUsd: 200 });
    expect(db.get().notifications.usr_sara?.[0]?.title).toBe('Payout sent');
  });

  it('keeps only a masked payout method', async () => {
    logIn('usr_sara');
    const { body } = await call('PUT', '/api/earnings/method', {
      kind: 'paypal',
      holder: 'Sara Al-Mansouri',
      email: 'sara.almansouri@mail.example',
    });
    expect(body.method).toEqual({
      kind: 'paypal',
      label: 'PayPal · s•••@mail.example',
      holder: 'Sara Al-Mansouri',
    });
    expect(JSON.stringify(db.get().earnings.usr_sara)).not.toContain('sara.almansouri@');
  });

  it('turns a submitted interview into an approved fee when QA accepts it', async () => {
    logIn('usr_sara');
    db.update((draft) => {
      draft.earnings.usr_sara?.items.unshift({
        id: 'ern_test',
        interviewId: 'int_test',
        title: 'Test interview',
        feeUsd: 300,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        decidedAt: null,
        paidAt: null,
        note: null,
      });
      draft.interviews.int_test = {
        id: 'int_test',
        ownerId: 'usr_sara',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        callTitle: 'Test interview',
      } as never;
    });
    expect(scenarios.decideInterview('accepted')).toBe(true);
    const { body } = await call('GET', '/api/earnings');
    expect(body.totals).toMatchObject({ pendingUsd: 0, availableUsd: 500 });
  });
});
