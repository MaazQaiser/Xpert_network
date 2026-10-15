import { describe, expect, it } from 'vitest';
import { db, setControls } from '@/test/mockBackend';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function json(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('library mock API (F3)', () => {
  it('filters by search, region family and price, newest first', async () => {
    logIn('usr_bilal');
    const { body } = await json('/api/library?region=rg_riyadh&maxPrice=160');
    const ids = (body.items as { id: string }[]).map((i) => i.id);
    // Riyadh matches Riyadh items and KSA/GCC-wide ones under the price cap.
    expect(ids).toContain('lib_riyadh_cafe_supply');
    expect(ids).toContain('lib_ksa_fnb_licensing');
    expect(ids).not.toContain('lib_qahwa_ops'); // 240 credits
    expect(ids).not.toContain('lib_dubai_rents');

    const search = await json('/api/library?q=qahwa');
    expect((search.body.items as { id: string }[]).map((i) => i.id)).toEqual(
      expect.arrayContaining(['lib_qahwa_ops', 'lib_gcc_coffee_2026']),
    );
  });

  it('marks an owned report updated since purchase', async () => {
    logIn('usr_ayesha');
    const { body } = await json('/api/library/lib_uae_retail');
    expect(body).toMatchObject({ owned: true, updatedSincePurchase: true });
    expect(body.updateNote).toMatch(/Q3 2026/);
  });

  it('buys a report, deducts credits and unlocks the content', async () => {
    logIn('usr_bilal');
    const before = db.get().wallets.usr_bilal!.balance;
    expect((await json('/api/library/lib_riyadh_cafe_supply/content')).status).toBe(403);

    const purchase = await json('/api/library/lib_riyadh_cafe_supply/purchase', { method: 'POST' });
    expect(purchase.status).toBe(200);
    expect(purchase.body.balance).toBe(before - 150);
    expect(db.get().wallets.usr_bilal!.transactions[0]).toMatchObject({
      type: 'purchase',
      amount: -150,
    });

    const content = await json('/api/library/lib_riyadh_cafe_supply/content');
    expect(content.status).toBe(200);
    expect((content.body.sections as unknown[]).length).toBe(4);
    expect(
      (await json('/api/library/lib_riyadh_cafe_supply/purchase', { method: 'POST' })).status,
    ).toBe(409);
  });

  it('refuses a purchase the balance can’t cover', async () => {
    logIn('usr_bilal');
    setControls({ lowCredits: true });
    const { status, body } = await json('/api/library/lib_qahwa_ops/purchase', { method: 'POST' });
    expect(status).toBe(402);
    expect(body.message).toMatch(/more credits/);
  });
});
