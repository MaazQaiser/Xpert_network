import { describe, expect, it } from 'vitest';
import type { Interview } from '@/features/interviews';
import { db, scenarios } from '@/test/mockBackend';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function json(method: string, path: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Interview & { code?: string },
  };
}

/** Reads an NDJSON turn stream into its events. */
async function turn(id: string, turnId: string, action: string, text: string) {
  turnId = `${id}-${turnId}`;
  const response = await fetch(`/api/interviews/${id}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnId, action, text }),
  });
  const lines = (await response.text()).split('\n').filter(Boolean);
  return lines.map(
    (line) =>
      JSON.parse(line) as { type: string; result?: { interview: Interview }; code?: string },
  );
}

async function readyInterview(): Promise<string> {
  logIn('usr_sara');
  const applied = await fetch('/api/calls/call_ksa_coffee_supply/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: {
        sq_sourcing: 'yes',
        sq_role: 'operator',
        sq_context: 'I sourced green coffee for 60 stores in Saudi Arabia.',
      },
    }),
  }).then((r) => r.json() as Promise<{ application: { interviewId: string } }>);
  return applied.application.interviewId;
}

const LONG =
  'For about eight years I ran sourcing for a chain of sixty cafés, buying green coffee from importers.';

describe('interviews mock API (F9)', () => {
  it('starts with a greeting and the first question, and needs the compliance box', async () => {
    const id = await readyInterview();
    expect(
      (
        await json('POST', `/api/interviews/${id}/start`, {
          mode: 'text',
          language: 'en',
          acceptCompliance: false,
        })
      ).status,
    ).toBe(422);
    const { body } = await json('POST', `/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    expect(body.status).toBe('in_progress');
    expect(body.transcript.map((e) => e.kind)).toEqual(['greeting', 'question']);
  });

  it('follows up a thin answer, then moves on', async () => {
    const id = await readyInterview();
    await json('POST', `/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    let events = await turn(id, 't1', 'answer', 'Sourcing lead.');
    let done = events.at(-1)?.result?.interview;
    expect(done?.transcript.at(-1)?.kind).toBe('follow_up');
    events = await turn(id, 't2', 'answer', LONG);
    done = events.at(-1)?.result?.interview;
    expect(done?.transcript.at(-1)?.text).toMatch(/Roughly how large/);
    expect(done?.sections[0]?.answered).toBe(1);
  });

  it('keeps exact figures out of the record and asks for a range', async () => {
    const id = await readyInterview();
    await json('POST', `/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    const events = await turn(
      id,
      't1',
      'answer',
      'Our internal landed cost was exactly SAR 41.75 per kilo.',
    );
    const interview = events.at(-1)?.result?.interview;
    expect(interview?.transcript.slice(-2).map((e) => e.kind)).toEqual(['removed', 'deflection']);
    expect(JSON.stringify(interview)).not.toContain('41.75');
  });

  it('drops a reply mid-stream without losing the turn, and the retry carries on', async () => {
    const id = await readyInterview();
    await json('POST', `/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    scenarios.dropConnection();
    const dropped = await turn(id, 't1', 'answer', LONG);
    expect(dropped.at(-1)).toMatchObject({ type: 'error', code: 'connection_lost' });
    expect(db.get().interviews[id]?.transcript).toHaveLength(2);
    const retried = await turn(id, 't1', 'answer', LONG);
    expect(retried.at(-1)?.result?.interview.transcript.at(-1)?.text).toMatch(/Roughly how large/);
  });

  it('pauses and resumes at the same question; ending early pays pro rata on submit', async () => {
    const id = await readyInterview();
    await json('POST', `/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    await turn(id, 't1', 'answer', LONG);
    expect((await json('PATCH', `/api/interviews/${id}`, { status: 'paused' })).body.status).toBe(
      'paused',
    );
    const resumed = (await json('PATCH', `/api/interviews/${id}`, { status: 'in_progress' })).body;
    expect(resumed.transcript.at(-1)?.text).toMatch(/Welcome back\. We were on background/);

    const review = (await json('POST', `/api/interviews/${id}/end`)).body;
    expect(review).toMatchObject({ status: 'review', endedEarly: true });
    expect(review.summaries[0]?.aiText).toMatch(/eight years/);
    await json('POST', `/api/interviews/${id}/submit`);
    // 1 of 12 questions answered → $300 × 1/12.
    expect(db.get().earnings.usr_sara?.items[0]).toMatchObject({ status: 'pending', feeUsd: 25 });
  });

  it('refuses voice when the microphone is denied', async () => {
    const id = await readyInterview();
    const { setControls } = await import('@/test/mockBackend');
    setControls({ micDenied: true });
    const { status, body } = await json('POST', `/api/interviews/${id}/start`, {
      mode: 'voice',
      language: 'en',
      acceptCompliance: true,
    });
    expect(status).toBe(409);
    expect(body.code).toBe('mic_denied');
  });
});
