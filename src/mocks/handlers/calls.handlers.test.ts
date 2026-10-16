import { describe, expect, it } from 'vitest';
import type { OpenCall } from '@/features/open-calls';
import { db, scenarios } from '@/test/mockBackend';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function apply(callId: string, answers: Record<string, string>) {
  const response = await fetch(`/api/calls/${callId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  return { status: response.status, call: (await response.json()) as OpenCall };
}

const CONTEXT = 'I sourced green coffee from three Saudi importers for 60 stores.';

describe('open calls mock API (F8)', () => {
  it('ranks calls with reasons from the expert’s profile', async () => {
    logIn('usr_sara');
    const calls = (await (await fetch('/api/calls')).json()) as OpenCall[];
    const coffee = calls.find((c) => c.id === 'call_ksa_coffee_supply');
    expect(coffee?.match).toMatchObject({ level: 'strong' });
    expect(coffee?.match.reasons[0]).toBe('Your industry: Specialty coffee');
    expect(calls.find((c) => c.id === 'call_gcc_menu_pricing')?.match.level).toBe('partial');
  });

  it('auto-approves a qualifying expert and creates the interview', async () => {
    logIn('usr_sara');
    const { call } = await apply('call_ksa_coffee_supply', {
      sq_sourcing: 'yes',
      sq_role: 'operator',
      sq_context: CONTEXT,
    });
    expect(call.application?.status).toBe('approved');
    const interview = db.get().interviews[call.application?.interviewId ?? ''];
    expect(interview).toMatchObject({ status: 'ready', allowedModes: ['voice', 'text'] });
    expect(db.get().notifications.usr_sara?.[0]?.title).toBe('You’re in: interview ready');
  });

  it('explains why an expert isn’t eligible', async () => {
    logIn('usr_sara');
    const { call } = await apply('call_ksa_coffee_supply', {
      sq_sourcing: 'no',
      sq_role: 'advisor',
      sq_context: CONTEXT,
    });
    expect(call.application).toMatchObject({ status: 'not_eligible' });
    expect(call.application?.note).toMatch(/sourced coffee/);
  });

  it('turns away calls about a company the expert listed as a conflict', async () => {
    logIn('usr_sara');
    const { call } = await apply('call_gulf_brands_menu', { sq_role: 'operator' });
    expect(call.application?.status).toBe('not_eligible');
    expect(call.application?.note).toMatch(/Gulf Brands Hospitality.*conflict/);
  });

  it('holds review-only calls for an analyst, then approves them from the toolbar', async () => {
    logIn('usr_sara');
    const { call } = await apply('call_uae_cold_chain', {
      sq_coldchain: 'yes',
      sq_role: 'supplier',
    });
    expect(call.application?.status).toBe('applied');
    // The seeded franchise application is older, so it's approved first.
    expect(scenarios.approveApplication()).toBe(true);
    expect(db.get().applications.usr_sara?.call_gcc_cafe_franchise?.status).toBe('approved');
  });

  it('rejects incomplete answers and second applications', async () => {
    logIn('usr_sara');
    expect((await apply('call_ksa_coffee_supply', { sq_sourcing: 'yes' })).status).toBe(422);
    expect(
      (await apply('call_gcc_cafe_franchise', { sq_franchise: 'yes', sq_role: 'operator' })).status,
    ).toBe(409);
  });
});
