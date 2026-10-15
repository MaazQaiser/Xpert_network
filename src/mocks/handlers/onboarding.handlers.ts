import { http, HttpResponse } from 'msw';
import {
  clientOnboardingPatchSchema,
  expertStepInputSchema,
  expertStepSchema,
  EXPERT_STEP_IDS,
  EXPERT_STEP_LABELS,
  missingSections,
  type ClientOnboarding,
  type ExpertOnboarding,
} from '@/features/onboarding';
import type { User } from '@/features/auth';
import { z } from 'zod';
import { getControls } from '../controls';
import { newClientOnboarding, newExpertOnboarding, TAXONOMY } from '../fixtures/onboarding';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

function clientRecord(user: User): ClientOnboarding {
  return db.get().clientOnboarding[user.id] ?? newClientOnboarding();
}

function expertRecord(user: User): ExpertOnboarding {
  return db.get().expertOnboarding[user.id] ?? newExpertOnboarding();
}

function saveExpert(user: User, next: ExpertOnboarding) {
  const saved = { ...next, updatedAt: new Date().toISOString() };
  db.update((draft) => {
    draft.expertOnboarding[user.id] = saved;
  });
  return saved;
}

/** Shared preamble: network delay, session, toolbar error, role check. */
async function guard(role: 'client' | 'expert') {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return { response: unauthorized() } as const;
  const failure = injectedError();
  if (failure) return { response: failure } as const;
  if (user.role !== role) {
    return {
      response: errorResponse(403, 'forbidden', 'This page is for a different kind of account.'),
    } as const;
  }
  return { user } as const;
}

const nextStep = (step: (typeof EXPERT_STEP_IDS)[number]) =>
  EXPERT_STEP_IDS[Math.min(EXPERT_STEP_IDS.indexOf(step) + 1, EXPERT_STEP_IDS.length - 1)] ??
  'submit';

export const onboardingHandlers = [
  http.get('/api/onboarding/taxonomy', async () => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    if (getControls().emptyData) {
      return HttpResponse.json({
        industries: [],
        regions: [],
        topics: [],
        languages: [],
        countries: [],
      });
    }
    return HttpResponse.json(TAXONOMY);
  }),

  // ——— F1 client onboarding ————————————————————————————————————————

  http.get('/api/onboarding/client', async () => {
    const result = await guard('client');
    if ('response' in result) return result.response;
    return HttpResponse.json(clientRecord(result.user));
  }),

  http.patch('/api/onboarding/client', async ({ request }) => {
    const result = await guard('client');
    if ('response' in result) return result.response;
    const { user } = result;
    const parsed = clientOnboardingPatchSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Check your answers.');
    const current = clientRecord(user);
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    );
    const next: ClientOnboarding = {
      ...current,
      ...patch,
      status:
        parsed.data.status ?? (current.status === 'not_started' ? 'in_progress' : current.status),
      updatedAt: new Date().toISOString(),
    };
    const about = parsed.data.about;
    db.update((draft) => {
      draft.clientOnboarding[user.id] = next;
      const stored = draft.users[user.id];
      if (stored && about) {
        if (about.jobTitle.trim()) stored.title = about.jobTitle.trim();
        if (about.organisation.trim()) stored.organisation = about.organisation.trim();
      }
    });
    return HttpResponse.json(next);
  }),

  // ——— F7 expert onboarding ————————————————————————————————————————

  http.get('/api/onboarding/expert', async () => {
    const result = await guard('expert');
    if ('response' in result) return result.response;
    return HttpResponse.json(expertRecord(result.user));
  }),

  /** Save one section and move to the next. */
  http.put('/api/onboarding/expert/steps', async ({ request }) => {
    const result = await guard('expert');
    if ('response' in result) return result.response;
    const { user } = result;
    const current = expertRecord(user);
    if (current.status === 'pending' || current.status === 'approved') {
      return errorResponse(
        409,
        'locked',
        'Your profile is in review. Contact support if something needs to change.',
      );
    }
    const parsed = expertStepInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        422,
        'invalid_input',
        parsed.error.issues[0]?.message ?? 'Check the highlighted fields.',
      );
    }
    const { step, data } = parsed.data;
    const saved = saveExpert(user, {
      ...current,
      [step]: data,
      status: 'in_progress',
      currentStep: nextStep(step),
    });
    if (step === 'basics') {
      db.update((draft) => {
        const stored = draft.users[user.id];
        if (stored) stored.title = data.headline;
      });
    }
    return HttpResponse.json(saved);
  }),

  /** Move between steps without saving (Back, stepper). */
  http.patch('/api/onboarding/expert', async ({ request }) => {
    const result = await guard('expert');
    if ('response' in result) return result.response;
    const parsed = z.object({ currentStep: expertStepSchema }).safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Choose a step.');
    const current = expertRecord(result.user);
    return HttpResponse.json(saveExpert(result.user, { ...current, ...parsed.data }));
  }),

  http.post('/api/onboarding/expert/submit', async () => {
    const result = await guard('expert');
    if ('response' in result) return result.response;
    const current = expertRecord(result.user);
    const missing = missingSections(current);
    if (missing.length > 0) {
      return errorResponse(
        422,
        'incomplete',
        `Complete ${missing.map((s) => EXPERT_STEP_LABELS[s]).join(', ')} before submitting.`,
      );
    }
    const now = new Date().toISOString();
    return HttpResponse.json(
      saveExpert(result.user, {
        ...current,
        status: 'pending',
        submittedAt: now,
        decidedAt: null,
      }),
    );
  }),

  /** After a rejection: edit the profile again (the decision note stays as guidance). */
  http.post('/api/onboarding/expert/reopen', async () => {
    const result = await guard('expert');
    if ('response' in result) return result.response;
    const current = expertRecord(result.user);
    if (current.status !== 'rejected') {
      return errorResponse(409, 'invalid_state', 'Only a declined application can be reopened.');
    }
    return HttpResponse.json(
      saveExpert(result.user, { ...current, status: 'in_progress', currentStep: 'submit' }),
    );
  }),
];
