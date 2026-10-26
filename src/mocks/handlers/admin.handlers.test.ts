import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/test/mockBackend';

// Seeds are relative to now; midday keeps "today" counts stable.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-22T12:00:00'));
  db.reset();
});
afterEach(() => vi.useRealTimers());

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const project = () => db.get().adminProjects['PRJ-1042']!;

describe('admin mock API (F11–F12)', () => {
  it('answers only to admins', async () => {
    logIn('usr_ayesha');
    expect((await call('/api/admin/inbox')).status).toBe(403);
    logIn('usr_ops');
    expect((await call('/api/admin/inbox')).status).toBe(200);
  });

  it('summarises today from the store', async () => {
    logIn('usr_ops');
    const { body } = await call('/api/admin/summary');
    expect(body).toMatchObject({
      newProjectEmails: 2,
      expertsPendingReview: 4,
      activeProjects: 2,
    });
  });

  it('edits and resets the client questions to the AI draft', async () => {
    logIn('usr_ops');
    const questions = project().questions.slice(1);
    await call('/api/admin/projects/PRJ-1042', 'PATCH', { questions });
    expect(project().questions).toHaveLength(7);
    expect(project().activity[0]?.text).toBe('You edited the client questions');

    await call('/api/admin/projects/PRJ-1042/reset', 'POST', { part: 'questions' });
    expect(project().questions).toHaveLength(8);
  });

  it('confirms a proposed fact but refuses one that needs the client', async () => {
    logIn('usr_ops');
    await call('/api/admin/projects/PRJ-1042/confirmations', 'POST', {
      confirmationId: 'c_deadline',
    });
    expect(project().facts.find((f) => f.id === 'f_deadline')).toMatchObject({
      value: '13 Nov',
      state: 'ok',
    });
    const refused = await call('/api/admin/projects/PRJ-1042/confirmations', 'POST', {
      confirmationId: 'c_budget',
    });
    expect(refused.status).toBe(400);
  });

  it('sends the clarification email to the sandbox and marks open items as asked', async () => {
    logIn('usr_ops');
    const draft = await call('/api/admin/projects/PRJ-1042/clarification');
    expect(draft.body.to).toBe('jenna.cho@ridgelineinsights.example');
    expect(draft.body.body).toContain('Budget');

    await call('/api/admin/projects/PRJ-1042/clarification', 'POST', draft.body);
    expect(db.get().adminMail[0]).toMatchObject({
      projectId: 'PRJ-1042',
      to: 'jenna.cho@ridgelineinsights.example',
    });
    expect(project().confirmations.every((c) => c.state === 'asked')).toBe(true);
  });

  it('approving starts matching and converts the inbox email', async () => {
    logIn('usr_ops');
    const { status } = await call('/api/admin/projects/PRJ-1042/approve', 'POST');
    expect(status).toBe(200);
    expect(project().status).toBe('matching');
    expect(db.get().adminInbox.req_ridgeline_audio?.status).toBe('converted');
    expect((await call('/api/admin/projects/PRJ-1042/approve', 'POST')).status).toBe(409);
  });

  it('returns 146 matches after approve and builds a top-10 shortlist', async () => {
    logIn('usr_ops');
    await call('/api/admin/projects/PRJ-1042/approve', 'POST');
    const matches = await call('/api/admin/projects/PRJ-1042/matches');
    expect(matches.status).toBe(200);
    expect(matches.body.experts).toHaveLength(146);
    expect((matches.body.experts as { id: string }[])[0]?.id).toBe('exp_4821');

    await call('/api/admin/projects/PRJ-1042/matches', 'PATCH', {
      expertId: 'exp_4821',
      pinned: true,
    });
    expect(
      db.get().adminMatches['PRJ-1042']?.experts.find((e) => e.id === 'exp_4821')?.pinned,
    ).toBe(true);

    const shortlist = await call('/api/admin/projects/PRJ-1042/shortlist', 'POST', { size: 10 });
    expect(shortlist.status).toBe(200);
    expect(shortlist.body.experts).toHaveLength(10);
    expect(project().status).toBe('shortlisted');
    expect((shortlist.body.experts as { id: string; selected: boolean }[])[0]).toMatchObject({
      id: 'exp_4821',
      selected: true,
    });

    const swapped = await call('/api/admin/projects/PRJ-1042/shortlist', 'PATCH', {
      removeId: 'exp_4821',
    });
    expect(swapped.status).toBe(200);
    const ids = (swapped.body.experts as { id: string }[]).map((e) => e.id);
    expect(ids).not.toContain('exp_4821');
    expect(ids).toHaveLength(10);
  });

  it.each([
    {
      id: 'PRJ-1043',
      count: 64,
      head: 'exp_5310',
      topic: 'Own approval',
      drop: 'Customer reaction',
    },
    { id: 'PRJ-1044', count: 38, head: 'exp_6207', topic: 'Market sizing', drop: 'Cost & margins' },
  ])('runs $id from approval to the call with its own experts', async (story) => {
    logIn('usr_ops');
    const base = `/api/admin/projects/${story.id}`;
    expect((await call(`${base}/approve`, 'POST')).status).toBe(200);
    const matches = await call(`${base}/matches`);
    const experts = matches.body.experts as { id: string }[];
    expect(experts).toHaveLength(story.count);
    expect(experts[0]?.id).toBe(story.head);

    const three = experts.slice(0, 3).map((e) => e.id);
    const availability = await call(`${base}/availability?experts=${three.join(',')}`);
    await call(`${base}/availability`, 'POST', {
      action: 'prepare_client',
      holdSlots: true,
      experts: (availability.body.experts as { expertId: string; slots: { id: string }[] }[]).map(
        (e) => ({ expertId: e.expertId, slotIds: e.slots.map((slot) => slot.id) }),
      ),
    });
    const draft = await call(`${base}/client-draft`);
    expect(draft.body.questionTopics).toContain(story.topic);
    await call(`${base}/client-draft`, 'POST', {
      action: 'send',
      subject: draft.body.subject,
      intro: draft.body.intro,
      expertIds: three,
      settings: draft.body.settings,
    });
    await call(`${base}/booking`, 'POST', { action: 'sync', standbyIds: [] });
    const booking = db.get().adminBooking[story.id]!;
    expect(booking.picks[1]?.note).toBeTruthy();
    await call(`${base}/booking`, 'POST', {
      action: 'lock',
      message: { ...booking.message, attachInvites: true, revealNames: true },
    });

    const session = await call(`${base}/call`);
    const topics = session.body.questionTopics as string[];
    const requests = session.body.requests as { kind: string; questionIndex: number | null }[];
    expect(requests.find((r) => r.kind === 'remove_requirement')?.questionIndex).toBe(
      topics.indexOf(story.drop),
    );
    const lines = session.body.lines as { text: string }[];
    expect(lines.some((line) => /headphone|Shokz|hike/i.test(line.text))).toBe(false);
  });

  it('the assistant answers from the store', async () => {
    logIn('usr_ops');
    const { body } = await call('/api/admin/assistant', 'POST', {
      text: 'Which experts need my review?',
    });
    expect(body.text).toContain('4 expert answers are waiting');
    expect((body.blocks as unknown[])[0]).toMatchObject({
      kind: 'experts',
      items: [{ projectId: 'PRJ-1040', count: 4, href: '/admin/projects/PRJ-1040' }],
    });
  });
});
