import { http, HttpResponse } from 'msw';
import {
  preflightSchema,
  summaryEditSchema,
  turnInputSchema,
  type Interview,
  type InterviewMode,
} from '@/features/interviews';
import { createId } from '@/shared/lib/id';
import { z } from 'zod';
import {
  currentQuestion,
  draftSummaries,
  openingTurn,
  sectionsFor,
  takeTurn,
  tokens,
  type StoredInterview,
} from '../ai/interviewer/engine';
import { getControls } from '../controls';
import { CALLS, type CallFixture } from '../fixtures/calls';
import { db } from '../store/db';
import { notifyUser } from './notify';
import {
  currentUser,
  errorResponse,
  injectedError,
  ndjsonStream,
  simulateNetwork,
  unauthorized,
} from './utils';

/** Toolbar “Drop connection”: the next interviewer reply is cut off mid-stream. */
let dropNextTurn = false;
export function dropNextInterviewTurn(): void {
  dropNextTurn = true;
}

/** Completed turns by id, so retrying after a dropped connection is idempotent. */
const completedTurns = new Set<string>();

function modesFor(call: CallFixture): InterviewMode[] {
  return call.mode === 'voice_or_text' ? ['voice', 'text'] : [call.mode];
}

export function createInterview(call: CallFixture, ownerId: string): StoredInterview {
  const interview: StoredInterview = {
    id: createId('int'),
    ownerId,
    callId: call.id,
    callTitle: call.title,
    topic: call.title,
    feeUsd: call.feeUsd,
    estMinutes: call.estMinutes,
    allowedModes: modesFor(call),
    mode: null,
    language: 'en',
    status: 'ready',
    sections: sectionsFor(call.guide),
    transcript: [],
    summaries: [],
    endedEarly: false,
    startedAt: null,
    elapsedSeconds: 0,
    pausedAt: null,
    submittedAt: null,
    decidedAt: null,
    decisionNote: null,
    cursor: { section: 0, question: 0, followedUp: false },
    notes: {},
  };
  db.update((draft) => {
    draft.interviews[interview.id] = interview;
  });
  return interview;
}

export function toClientInterview(stored: StoredInterview): Interview {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- server-only state stays here
  const { ownerId, cursor, notes, ...interview } = stored;
  return interview;
}

function guideFor(interview: StoredInterview) {
  return CALLS.find((c) => c.id === interview.callId)?.guide ?? [];
}

function load(id: string) {
  const user = currentUser();
  if (!user) return { error: unauthorized() };
  const failure = injectedError();
  if (failure) return { error: failure };
  const interview = db.get().interviews[id];
  if (!interview || interview.ownerId !== user.id) {
    return { error: errorResponse(404, 'not_found', 'We couldn’t find that interview.') };
  }
  return { interview: structuredClone(interview), user };
}

function save(interview: StoredInterview) {
  db.update((draft) => {
    draft.interviews[interview.id] = interview;
  });
  return HttpResponse.json(toClientInterview(interview));
}

/** Adds the seconds since the current stretch started, e.g. before pausing. */
function bankElapsed(interview: StoredInterview, now = Date.now()) {
  if (interview.status !== 'in_progress' || !interview.startedAt) return;
  interview.elapsedSeconds += Math.max(
    0,
    Math.round((now - new Date(interview.startedAt).getTime()) / 1000),
  );
  interview.startedAt = new Date(now).toISOString();
}

function toReview(interview: StoredInterview, endedEarly: boolean) {
  bankElapsed(interview);
  interview.status = 'review';
  interview.endedEarly = endedEarly;
  interview.pausedAt = null;
  interview.summaries = draftSummaries(interview, guideFor(interview));
}

const patchSchema = z.object({
  status: z.enum(['paused', 'in_progress']).optional(),
  mode: z.enum(['voice', 'text']).optional(),
});

export const interviewsHandlers = [
  // A prototype microphone check: the “Mic denied” toggle plays the browser refusing access.
  http.get('/api/interviews/mic-check', async () => {
    await simulateNetwork();
    return HttpResponse.json({ granted: !getControls().micDenied });
  }),

  http.get('/api/interviews', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    if (getControls().emptyData) return HttpResponse.json([]);
    const mine = Object.values(db.get().interviews)
      .filter((i) => i.ownerId === user.id)
      .map(toClientInterview);
    return HttpResponse.json(mine);
  }),

  http.get('/api/interviews/:id', async ({ params }) => {
    await simulateNetwork();
    const { interview, error } = load(String(params.id));
    if (error) return error;
    return HttpResponse.json(toClientInterview(interview));
  }),

  http.post('/api/interviews/:id/start', async ({ params, request }) => {
    await simulateNetwork();
    const { interview, error } = load(String(params.id));
    if (error) return error;
    const parsed = preflightSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        422,
        'invalid',
        parsed.error.issues[0]?.message ?? 'Check the pre-flight steps.',
      );
    }
    if (!interview.allowedModes.includes(parsed.data.mode)) {
      return errorResponse(422, 'mode_not_allowed', 'This call is text only.');
    }
    if (parsed.data.mode === 'voice' && getControls().micDenied) {
      return errorResponse(
        409,
        'mic_denied',
        'We can’t use your microphone. Switch to text, or allow the microphone in your browser settings.',
      );
    }
    if (interview.status !== 'ready') return HttpResponse.json(toClientInterview(interview));
    interview.mode = parsed.data.mode;
    interview.language = parsed.data.language;
    interview.status = 'in_progress';
    interview.startedAt = new Date().toISOString();
    interview.transcript = openingTurn(interview, guideFor(interview), parsed.data.mode);
    return save(interview);
  }),

  http.post('/api/interviews/:id/turn', async ({ params, request }) => {
    const { interview, error } = load(String(params.id));
    if (error) return error;
    const parsed = turnInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid', 'Write an answer first.');
    if (interview.status !== 'in_progress') {
      return errorResponse(409, 'not_running', 'Resume the interview to answer.');
    }
    if (parsed.data.action === 'answer' && !parsed.data.text.trim()) {
      return errorResponse(422, 'empty', 'Write or say an answer first.');
    }

    const replay = completedTurns.has(parsed.data.turnId);
    const drop = dropNextTurn && !replay;
    dropNextTurn = false;
    const working = structuredClone(interview);
    const outcome = replay
      ? { entries: [], finished: false }
      : takeTurn(working, guideFor(working), parsed.data);
    working.transcript.push(...outcome.entries);
    const aiText = outcome.entries
      .filter((e) => e.speaker === 'ai')
      .map((e) => e.text)
      .join(' ');

    return ndjsonStream(async (send, pause) => {
      send({ type: 'step', label: 'Listening to your answer' });
      await pause(350);
      const parts = tokens(aiText);
      const cutoff = drop ? Math.ceil(parts.length / 2) : parts.length;
      for (const token of parts.slice(0, cutoff)) {
        send({ type: 'token', text: token });
        await pause(18);
      }
      if (drop) {
        // Nothing is saved, so retrying the same turn picks up exactly here.
        send({
          type: 'error',
          code: 'connection_lost',
          message:
            'The connection dropped. Your answers so far are saved; resume to carry on from this question.',
        });
        return;
      }
      if (!replay) {
        if (outcome.finished) toReview(working, false);
        completedTurns.add(parsed.data.turnId);
        db.update((draft) => {
          draft.interviews[working.id] = working;
        });
      }
      const latest = db.get().interviews[working.id] ?? working;
      send({ type: 'done', result: { interview: toClientInterview(latest) } });
    });
  }),

  http.patch('/api/interviews/:id', async ({ params, request }) => {
    await simulateNetwork();
    const { interview, error } = load(String(params.id));
    if (error) return error;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid', 'Check the change.');
    const { status, mode } = parsed.data;
    if (mode) {
      if (!interview.allowedModes.includes(mode))
        return errorResponse(422, 'mode_not_allowed', 'This call is text only.');
      if (mode === 'voice' && getControls().micDenied) {
        return errorResponse(
          409,
          'mic_denied',
          'We can’t use your microphone, so you’re still on text.',
        );
      }
      interview.mode = mode;
    }
    if (status === 'paused' && interview.status === 'in_progress') {
      bankElapsed(interview);
      interview.status = 'paused';
      interview.pausedAt = new Date().toISOString();
    } else if (status === 'in_progress' && interview.status === 'paused') {
      interview.status = 'in_progress';
      interview.pausedAt = null;
      interview.startedAt = new Date().toISOString();
      const resume = currentQuestion(interview, guideFor(interview));
      if (resume) {
        interview.transcript.push({
          id: createId('tr'),
          speaker: 'ai',
          kind: 'question',
          text: `Welcome back. We were on ${resume.section.title.toLowerCase()}: ${resume.text}`,
          sectionId: resume.section.id,
          at: new Date().toISOString(),
        });
      }
    }
    return save(interview);
  }),

  http.post('/api/interviews/:id/end', async ({ params }) => {
    await simulateNetwork();
    const { interview, error } = load(String(params.id));
    if (error) return error;
    if (interview.status !== 'in_progress' && interview.status !== 'paused') {
      return errorResponse(409, 'not_running', 'This interview has already ended.');
    }
    toReview(interview, true);
    return save(interview);
  }),

  http.patch('/api/interviews/:id/summaries', async ({ params, request }) => {
    await simulateNetwork();
    const { interview, error } = load(String(params.id));
    if (error) return error;
    const body = (await request.json()) as { sectionId?: string; text?: string | null };
    const summary = interview.summaries.find((s) => s.sectionId === body.sectionId);
    if (!summary) return errorResponse(404, 'not_found', 'That section has no summary.');
    if (body.text === null) {
      summary.text = summary.aiText;
      summary.isEdited = false;
    } else {
      const parsed = summaryEditSchema.safeParse(body);
      if (!parsed.success)
        return errorResponse(
          422,
          'invalid',
          parsed.error.issues[0]?.message ?? 'Check the summary.',
        );
      summary.text = parsed.data.text;
      summary.isEdited = parsed.data.text !== summary.aiText;
    }
    return save(interview);
  }),

  http.post('/api/interviews/:id/submit', async ({ params }) => {
    await simulateNetwork();
    const { interview, error, user } = load(String(params.id));
    if (error) return error;
    if (interview.status !== 'review')
      return errorResponse(409, 'not_in_review', 'Finish the interview first.');
    const at = new Date().toISOString();
    interview.status = 'submitted';
    interview.submittedAt = at;
    // A partial interview is paid pro rata on the questions covered.
    const covered = interview.sections.reduce((n, s) => n + s.answered, 0);
    const total = interview.sections.reduce((n, s) => n + s.total, 0);
    const fee = interview.endedEarly
      ? Math.round((interview.feeUsd * covered) / Math.max(1, total))
      : interview.feeUsd;
    db.update((draft) => {
      const earnings = draft.earnings[user.id] ?? { items: [], payouts: [], method: null };
      earnings.items.unshift({
        id: createId('ern'),
        interviewId: interview.id,
        title: interview.callTitle,
        feeUsd: fee,
        status: 'pending',
        submittedAt: at,
        decidedAt: null,
        paidAt: null,
        note: interview.endedEarly
          ? `Ended early: ${covered} of ${total} questions, paid pro rata.`
          : null,
      });
      draft.earnings[user.id] = earnings;
    });
    return save(interview);
  }),
];

/** Toolbar: QA accepts (or rejects) the expert's oldest submitted interview. */
export function decideOldestInterview(userId: string, decision: 'accepted' | 'rejected'): boolean {
  const interview = Object.values(db.get().interviews)
    .filter((i) => i.ownerId === userId && i.status === 'submitted')
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))[0];
  if (!interview) return false;
  const at = new Date().toISOString();
  const note =
    decision === 'rejected'
      ? 'The answers didn’t cover the call’s questions in enough depth. You can still apply to other calls.'
      : null;
  db.update((draft) => {
    const stored = draft.interviews[interview.id];
    if (stored) Object.assign(stored, { status: decision, decidedAt: at, decisionNote: note });
    const item = draft.earnings[userId]?.items.find((e) => e.interviewId === interview.id);
    if (item)
      Object.assign(item, {
        status: decision === 'accepted' ? 'approved' : 'rejected',
        decidedAt: at,
        note: note ?? item.note,
      });
  });
  notifyUser(userId, {
    event: 'application_update',
    title: decision === 'accepted' ? 'Interview accepted' : 'Interview not accepted',
    body:
      decision === 'accepted'
        ? `Your fee for “${interview.callTitle}” is approved and ready to pay out.`
        : 'See why on your earnings page.',
    href: '/expert/earnings',
  });
  return true;
}

/** Toolbar: the expert's interview has been paused for 15 minutes. */
export function pauseLongAgo(userId: string): boolean {
  const interview = Object.values(db.get().interviews).find(
    (i) => i.ownerId === userId && (i.status === 'in_progress' || i.status === 'paused'),
  );
  if (!interview) return false;
  db.update((draft) => {
    const stored = draft.interviews[interview.id];
    if (!stored) return;
    if (stored.status === 'in_progress') bankElapsed(stored);
    stored.status = 'paused';
    stored.pausedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  });
  return true;
}
