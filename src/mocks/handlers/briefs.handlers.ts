import { http, HttpResponse } from 'msw';
import {
  briefPatchSchema,
  checkoutInputSchema,
  initialStepStatus,
  turnInputSchema,
  type ResearchBrief,
  type TurnResult,
} from '@/features/goal-chat';
import type { User } from '@/features/auth';
import { createId } from '@/shared/lib/id';
import { computeCoverage } from '../ai/goalChat/coverage';
import { runTurn, toMessage, TurnRejected } from '../ai/goalChat/engine';
import { getControls } from '../controls';
import { ALL_SUBJECTS } from '../fixtures/entities';
import { LIBRARY_ITEMS } from '../fixtures/library';
import { newRequest } from '../fixtures/requests';
import { db } from '../store/db';
import {
  currentUser,
  errorResponse,
  injectedError,
  ndjsonStream,
  simulateNetwork,
  tokenise,
  unauthorized,
} from './utils';
import { effectiveWallet } from './wallet.handlers';

function newBrief(user: User, now: Date): ResearchBrief {
  return {
    id: createId('brf'),
    ownerId: user.id,
    title: 'Untitled brief',
    goalType: null,
    objective: null,
    subjects: [],
    questions: [],
    constraints: { deadline: null, budgetCredits: null, depth: null },
    status: 'draft',
    currentStep: 'goal',
    stepStatus: initialStepStatus(),
    chosenOption: null,
    aiSnapshot: null,
    isEditedByUser: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function coverageFor(brief: ResearchBrief, userId: string) {
  const controls = getControls();
  return computeCoverage(brief, {
    library: controls.emptyData ? [] : LIBRARY_ITEMS,
    ownedReportIds: db.get().ownedReports[userId] ?? [],
    scenario: controls.coverage,
  });
}

function ownBrief(id: string | readonly string[] | undefined, user: User): ResearchBrief | null {
  const brief = typeof id === 'string' ? db.get().briefs[id] : undefined;
  return brief && brief.ownerId === user.id ? brief : null;
}

const notFound = () =>
  errorResponse(404, 'not_found', 'We couldn’t find that brief. It may have been deleted.');

export const briefsHandlers = [
  http.get('/api/briefs', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    if (getControls().emptyData) return HttpResponse.json([]);
    const briefs = Object.values(db.get().briefs)
      .filter((b) => b.ownerId === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return HttpResponse.json(briefs);
  }),

  http.post('/api/briefs', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const brief = newBrief(user, new Date());
    db.update((draft) => {
      draft.briefs[brief.id] = brief;
      draft.messages[brief.id] = [];
    });
    return HttpResponse.json(brief, { status: 201 });
  }),

  http.get('/api/briefs/:briefId', async ({ params }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    return HttpResponse.json({ brief, messages: db.get().messages[brief.id] ?? [] });
  }),

  http.patch('/api/briefs/:briefId', async ({ params, request }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    const parsed = briefPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        422,
        'invalid_input',
        parsed.error.issues[0]?.message ?? 'Check the highlighted fields.',
      );
    }
    const { revertToAi, ...patch } = parsed.data;
    const next: ResearchBrief =
      revertToAi && brief.aiSnapshot
        ? { ...brief, ...brief.aiSnapshot, isEditedByUser: false }
        : {
            ...brief,
            ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
            isEditedByUser: true,
          };
    // Edits after confirming re-open the confirmation (options depend on the brief).
    const reopened: ResearchBrief =
      next.status === 'confirmed'
        ? {
            ...next,
            status: 'draft',
            currentStep: 'summary',
            chosenOption: null,
            stepStatus: {
              ...next.stepStatus,
              summary: 'active',
              options: 'todo',
              checkout: 'todo',
            },
          }
        : next;
    const saved = { ...reopened, updatedAt: new Date().toISOString() };
    db.update((draft) => {
      draft.briefs[saved.id] = saved;
    });
    return HttpResponse.json(saved);
  }),

  http.delete('/api/briefs/:briefId', async ({ params }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    db.update((draft) => {
      draft.briefs = Object.fromEntries(
        Object.entries(draft.briefs).filter(([id]) => id !== brief.id),
      );
      draft.messages = Object.fromEntries(
        Object.entries(draft.messages).filter(([id]) => id !== brief.id),
      );
    });
    return new HttpResponse(null, { status: 204 });
  }),

  /** One conversational turn, streamed as NDJSON (see shared/ai/protocol.ts). */
  http.post('/api/briefs/:briefId/turns', async ({ params, request }) => {
    const user = currentUser();
    if (!user) return unauthorized();
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    const parsed = turnInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'That answer couldn’t be read. Try again.');
    const { turnId, action } = parsed.data;

    const previous = db.get().turns[turnId];
    let outcome: TurnResult;
    let steps: string[] = [];
    if (previous) {
      outcome = previous;
    } else {
      const now = new Date();
      let engineResult;
      try {
        engineResult = runTurn(brief, action, {
          user,
          now,
          getCoverage: (b) => coverageFor(b, user.id),
          lastWidget:
            (db.get().messages[brief.id] ?? []).filter((m) => m.role === 'assistant').at(-1)
              ?.widget ?? null,
        });
      } catch (error) {
        if (error instanceof TurnRejected)
          return errorResponse(422, 'invalid_input', error.message);
        throw error;
      }
      steps = engineResult.steps;
      const step = engineResult.brief.currentStep;
      outcome = {
        brief: engineResult.brief,
        userMessage: engineResult.userText
          ? toMessage('user', engineResult.userText, step, null, now)
          : null,
        assistantMessage: toMessage(
          'assistant',
          engineResult.reply,
          step,
          engineResult.widget,
          now,
        ),
      };
    }

    const failMidStream = getControls().apiError;
    return ndjsonStream(async (send, pause) => {
      for (const label of steps) {
        send({ type: 'step', label });
        await pause(650);
      }
      const tokens = tokenise(outcome.assistantMessage.text);
      const cutoff = failMidStream ? Math.ceil(tokens.length / 2) : tokens.length;
      for (const token of tokens.slice(0, cutoff)) {
        send({ type: 'token', text: token });
        await pause(28);
      }
      if (failMidStream) {
        send({
          type: 'error',
          code: 'stream_interrupted',
          message:
            'The connection dropped while we were replying. Your answer is safe — try again.',
        });
        return;
      }
      if (request.signal.aborted) return;
      if (!previous) {
        db.update((draft) => {
          draft.briefs[outcome.brief.id] = outcome.brief;
          const list = draft.messages[outcome.brief.id] ?? [];
          if (outcome.userMessage) list.push(outcome.userMessage);
          list.push(outcome.assistantMessage);
          draft.messages[outcome.brief.id] = list;
          draft.turns[turnId] = outcome;
        });
      }
      send({ type: 'done', result: outcome });
    });
  }),

  http.get('/api/briefs/:briefId/coverage', async ({ params }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    return HttpResponse.json(coverageFor(brief, user.id));
  }),

  http.post('/api/briefs/:briefId/checkout', async ({ params, request }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const brief = ownBrief(params.briefId, user);
    if (!brief) return notFound();
    const parsed = checkoutInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Choose what to buy or request.');
    const { option, reportIds } = parsed.data;

    const owned = db.get().ownedReports[user.id] ?? [];
    const toBuy = LIBRARY_ITEMS.filter(
      (item) => reportIds.includes(item.id) && !owned.includes(item.id),
    );
    const total = toBuy.reduce((sum, item) => sum + item.priceCredits, 0);
    const wallet = effectiveWallet(user.id);
    if (option !== 'custom' && total > wallet.balance) {
      return errorResponse(
        402,
        'insufficient_credits',
        `You need ${total - wallet.balance} more credits to buy these reports. Top up, or remove a report.`,
      );
    }

    const coverage = coverageFor(brief, user.id);
    const gapIds = coverage.items.filter((i) => i.coverage !== 'full').map((i) => i.questionId);
    const now = new Date();
    const requestId = option === 'library' ? null : createId('req');
    const purchasedReportIds = option === 'custom' ? [] : toBuy.map((item) => item.id);

    const parts: string[] = [];
    if (purchasedReportIds.length) {
      parts.push(
        `You now own ${purchasedReportIds.length} ${purchasedReportIds.length === 1 ? 'report' : 'reports'}. ${total} credits were taken from your wallet.`,
      );
    }
    if (requestId) {
      parts.push(
        'Your quote request is in. Expect a quote within 24 hours — we’ll notify you, and you can track it in Requests.',
      );
    }
    parts.push('This brief is saved in your workspace.');
    const assistantMessage = toMessage(
      'assistant',
      parts.join(' '),
      'checkout',
      {
        kind: 'done',
        option,
        purchasedReportIds,
        requestId,
      },
      now,
    );

    const submitted: ResearchBrief = {
      ...brief,
      status: 'submitted',
      chosenOption: option,
      stepStatus: { ...brief.stepStatus, checkout: 'done' },
      updatedAt: now.toISOString(),
    };

    db.update((draft) => {
      draft.briefs[brief.id] = submitted;
      (draft.messages[brief.id] ??= []).push(assistantMessage);
      draft.ownedReports[user.id] = [...owned, ...purchasedReportIds];
      const purchases = (draft.reportPurchases[user.id] ??= {});
      for (const itemId of purchasedReportIds) purchases[itemId] = now.toISOString();
      const userWallet = draft.wallets[user.id];
      if (userWallet && total > 0 && option !== 'custom') {
        userWallet.balance -= total;
        for (const item of toBuy) {
          userWallet.transactions.unshift({
            id: createId('txn'),
            type: 'purchase',
            amount: -item.priceCredits,
            description: item.title,
            at: now.toISOString(),
          });
        }
      }
      if (requestId) {
        const questionIds = option === 'mix' ? gapIds : brief.questions.map((q) => q.id);
        draft.requests[requestId] = newRequest({
          id: requestId,
          ownerId: user.id,
          briefId: brief.id,
          title: brief.title,
          objective: brief.objective,
          questions: brief.questions
            .filter((q) => questionIds.includes(q.id))
            .map(({ id, text, topic }) => ({ id, text, topic })),
          now,
        });
      }
    });

    return HttpResponse.json({ brief: submitted, assistantMessage, purchasedReportIds, requestId });
  }),
];

export const subjectsHandlers = [
  http.get('/api/subjects', async () => {
    await simulateNetwork();
    return HttpResponse.json(ALL_SUBJECTS);
  }),
];
