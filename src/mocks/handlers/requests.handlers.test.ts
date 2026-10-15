import { describe, expect, it } from 'vitest';
import { db, setControls } from '@/test/mockBackend';
import { scenarios } from '@/mocks/scenarios';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function post(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const wallet = () => db.get().wallets.usr_ayesha!;
const request = () => db.get().requests.req_qahwa_pipeline!;

describe('custom requests mock API (F4)', () => {
  it('accepting a quote holds its credits', async () => {
    logIn('usr_ayesha');
    const before = wallet().balance;
    const credits = request().quote!.credits;
    const { status } = await post('/api/requests/req_qahwa_pipeline/accept');
    expect(status).toBe(200);
    expect(request().status).toBe('accepted');
    expect(wallet()).toMatchObject({ balance: before - credits, held: credits });
    expect(wallet().transactions[0]).toMatchObject({ type: 'hold', amount: -credits });
  });

  it('refuses to accept when the balance is short', async () => {
    logIn('usr_ayesha');
    setControls({ lowCredits: true });
    expect((await post('/api/requests/req_qahwa_pipeline/accept')).status).toBe(402);
  });

  it('cancelling before interviews refunds the hold in full', async () => {
    logIn('usr_ayesha');
    const before = wallet().balance;
    await post('/api/requests/req_qahwa_pipeline/accept');
    await post('/api/requests/req_qahwa_pipeline/cancel');
    expect(request().status).toBe('cancelled');
    expect(wallet()).toMatchObject({ balance: before, held: 0 });
  });

  it('advances through recruiting and interviews to a readable delivered report', async () => {
    logIn('usr_ayesha');
    await post('/api/requests/req_qahwa_pipeline/accept');
    const statuses: string[] = [];
    while (scenarios.advanceRequest()) statuses.push(request().status);
    expect(statuses[0]).toBe('recruiting');
    expect(statuses).toContain('interviews');
    expect(statuses.at(-1)).toBe('delivered');
    expect(wallet().held).toBe(0);
    expect(wallet().transactions[0]).toMatchObject({ type: 'spent' });

    const reportId = request().delivery!.reportId;
    const content = await fetch(`/api/library/${reportId}/content`);
    expect(content.status).toBe(200);
    const body = (await content.json()) as { sections: { title: string }[] };
    expect(body.sections[0]!.title).toMatch(/Qahwa House sales trended/);
  });

  it('partial delivery refunds the missing interviews', async () => {
    logIn('usr_ayesha');
    await post('/api/requests/req_qahwa_pipeline/accept');
    scenarios.advanceRequest(); // recruiting
    scenarios.advanceRequest(); // interviews
    const before = wallet().balance;
    expect(scenarios.deliverPartially()).toBe(true);
    const { delivery } = request();
    expect(delivery).toMatchObject({ partial: true });
    expect(delivery!.refundCredits).toBeGreaterThan(0);
    expect(wallet().balance).toBe(before + delivery!.refundCredits);
  });

  it('answers a question about the quote with a scripted reply', async () => {
    logIn('usr_ayesha');
    await post('/api/requests/req_qahwa_pipeline/messages', { text: 'Can it be cheaper?' });
    const [question, reply] = request().messages;
    expect(question).toMatchObject({ author: 'client' });
    expect(reply).toMatchObject({ author: 'xpert' });
    expect(reply!.text).toMatch(/15% less/);
  });

  it('an expired quote can’t be accepted but can be re-quoted', async () => {
    logIn('usr_ayesha');
    expect(scenarios.expireQuote()).toBe(true);
    expect((await post('/api/requests/req_qahwa_pipeline/accept')).status).toBe(409);
    expect((await post('/api/requests/req_qahwa_pipeline/requote')).status).toBe(200);
    expect(request().status).toBe('quote_requested');
  });
});
