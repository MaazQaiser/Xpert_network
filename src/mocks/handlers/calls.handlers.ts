import { http, HttpResponse } from 'msw';
import {
  applyInputSchema,
  screeningFormSchema,
  type CallMatch,
  type MatchLevel,
  type OpenCall,
} from '@/features/open-calls';
import { getControls } from '../controls';
import { CALLS, type CallFixture } from '../fixtures/calls';
import { INDUSTRIES, REGIONS } from '../fixtures/entities';
import { TAXONOMY } from '../fixtures/onboarding';
import { db } from '../store/db';
import { notifyUser } from './notify';
import { createInterview } from './interviews.handlers';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const label = (list: { id: string; label: string }[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

/** The region and every region it sits inside, e.g. Riyadh → Saudi Arabia → GCC. */
function regionLine(id: string): string[] {
  const line: string[] = [];
  let current = REGIONS.find((r) => r.id === id);
  while (current) {
    line.push(current.id);
    const parentId: string | null | undefined = current.parentId;
    current = parentId ? REGIONS.find((r) => r.id === parentId) : undefined;
  }
  return line;
}

/** Scores a call against the expert's profile and says why (F8 match, F12 fit score). */
export function matchFor(call: CallFixture, userId: string): CallMatch {
  const expertise = db.get().expertOnboarding[userId]?.expertise;
  if (!expertise)
    return { level: 'partial', score: 0, reasons: ['Complete your profile to see matches.'] };
  const reasons: string[] = [];
  let score = 0;
  if (expertise.industryIds.includes(call.industryId)) {
    score += 40;
    reasons.push(`Your industry: ${label(INDUSTRIES, call.industryId)}`);
  }
  const topics = call.topicIds.filter((id) => expertise.topicIds.includes(id));
  if (topics.length) {
    score += Math.min(45, topics.length * 20);
    reasons.push(
      `${topics.length === 1 ? 'Your topic' : `${topics.length} of your topics`}: ${topics
        .map((id) => label(TAXONOMY.topics, id))
        .join(', ')}`,
    );
  }
  const region = call.regionIds.find((id) =>
    expertise.regionIds.some(
      (mine) => regionLine(id).includes(mine) || regionLine(mine).includes(id),
    ),
  );
  if (region) {
    score += 15;
    reasons.push(`Your region: ${label(REGIONS, region)}`);
  }
  if (!reasons.length) reasons.push('Outside your listed industries and topics');
  const level: MatchLevel = score >= 75 ? 'strong' : score >= 50 ? 'good' : 'partial';
  return { level, score: Math.min(100, score), reasons };
}

function toOpenCall(call: CallFixture, userId: string): OpenCall {
  const stored = db.get().applications[userId]?.[call.id];
  return {
    id: call.id,
    title: call.title,
    brief: call.brief,
    industry: { id: call.industryId, label: label(INDUSTRIES, call.industryId) },
    regions: call.regionIds.map((id) => ({ id, label: label(REGIONS, id) })),
    topics: call.topicIds.map((id) => label(TAXONOMY.topics, id)),
    companiesInScope: call.companiesInScope,
    feeUsd: call.feeUsd,
    estMinutes: call.estMinutes,
    deadline: call.deadline,
    mode: call.mode,
    evergreen: call.evergreen,
    spotsLeft: call.spotsLeft,
    sections: call.guide.map(({ id, title }) => ({ id, title })),
    screening: call.screening,
    match: matchFor(call, userId),
    publishedAt: call.publishedAt,
    application: stored
      ? { status: stored.status, at: stored.at, note: stored.note, interviewId: stored.interviewId }
      : null,
  };
}

/** A company the call covers that the expert listed as a conflict, if any. */
function conflictFor(call: CallFixture, userId: string): string | null {
  const conflicts = db.get().expertOnboarding[userId]?.compliance?.conflicts.toLowerCase() ?? '';
  return (
    call.companiesInScope.find((company) => {
      const name = company.toLowerCase();
      return conflicts.length > 0 && conflicts.includes(name.split(' (')[0] ?? name);
    }) ?? null
  );
}

function expertOnly() {
  const user = currentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== 'expert')
    return { error: errorResponse(403, 'forbidden', 'Open calls are for experts.') };
  return { user };
}

export const callsHandlers = [
  http.get('/api/calls', async () => {
    await simulateNetwork();
    const { user, error } = expertOnly();
    if (error) return error;
    const failure = injectedError();
    if (failure) return failure;
    if (getControls().emptyData) return HttpResponse.json([]);
    return HttpResponse.json(CALLS.map((call) => toOpenCall(call, user.id)));
  }),

  http.get('/api/calls/:callId', async ({ params }) => {
    await simulateNetwork();
    const { user, error } = expertOnly();
    if (error) return error;
    const failure = injectedError();
    if (failure) return failure;
    const call = CALLS.find((c) => c.id === params.callId);
    if (!call)
      return errorResponse(404, 'not_found', 'We couldn’t find that call. It may have closed.');
    return HttpResponse.json(toOpenCall(call, user.id));
  }),

  http.post('/api/calls/:callId/apply', async ({ params, request }) => {
    await simulateNetwork();
    const { user, error } = expertOnly();
    if (error) return error;
    const failure = injectedError();
    if (failure) return failure;
    const call = CALLS.find((c) => c.id === params.callId);
    if (!call)
      return errorResponse(404, 'not_found', 'We couldn’t find that call. It may have closed.');
    if (db.get().applications[user.id]?.[call.id]) {
      return errorResponse(409, 'already_applied', 'You’ve already applied to this call.');
    }
    const body = applyInputSchema.safeParse(await request.json());
    const answers = body.success
      ? screeningFormSchema(call.screening).safeParse(body.data.answers)
      : null;
    if (!answers?.success) {
      return errorResponse(422, 'invalid', 'Answer every screening question to apply.');
    }

    const at = new Date().toISOString();
    const conflict = conflictFor(call, user.id);
    const failed = Object.entries(call.eligibility.required).find(
      ([questionId, rule]) => answers.data[questionId] !== rule.answer,
    );
    let application: {
      status: 'applied' | 'approved' | 'not_eligible';
      note: string | null;
      interviewId: string | null;
    };
    if (conflict) {
      application = {
        status: 'not_eligible',
        note: `This call covers ${conflict}, which you listed as a conflict of interest. Thanks for keeping that clear.`,
        interviewId: null,
      };
    } else if (failed) {
      application = { status: 'not_eligible', note: failed[1].note, interviewId: null };
    } else if (call.eligibility.review) {
      application = {
        status: 'applied',
        note: 'An analyst is checking your answers. Most applications are decided within a day.',
        interviewId: null,
      };
    } else {
      const interview = createInterview(call, user.id);
      application = { status: 'approved', note: null, interviewId: interview.id };
    }

    db.update((draft) => {
      draft.applications[user.id] = {
        ...draft.applications[user.id],
        [call.id]: { ...application, at, answers: answers.data },
      };
    });
    if (application.status === 'approved') {
      notifyUser(user.id, {
        event: 'application_update',
        title: 'You’re in: interview ready',
        body: `Start “${call.title}” whenever suits you before the deadline.`,
        href: `/expert/interviews/${application.interviewId}`,
      });
    }
    return HttpResponse.json(toOpenCall(call, user.id));
  }),
];

/** Toolbar: an analyst approves the expert's oldest application under review. */
export function approveOldestApplication(userId: string): boolean {
  const pending = Object.entries(db.get().applications[userId] ?? {})
    .filter(([, a]) => a.status === 'applied')
    .sort(([, a], [, b]) => a.at.localeCompare(b.at))[0];
  const call = pending ? CALLS.find((c) => c.id === pending[0]) : undefined;
  if (!pending || !call) return false;
  const interview = createInterview(call, userId);
  db.update((draft) => {
    const application = draft.applications[userId]?.[call.id];
    if (application) {
      application.status = 'approved';
      application.note = null;
      application.interviewId = interview.id;
    }
  });
  notifyUser(userId, {
    event: 'application_update',
    title: 'Application approved',
    body: `“${call.title}” is ready. Start it whenever suits you.`,
    href: `/expert/interviews/${interview.id}`,
  });
  return true;
}
