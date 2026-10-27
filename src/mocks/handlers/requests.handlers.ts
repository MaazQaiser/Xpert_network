import { http, HttpResponse } from 'msw';
import {
  declineInputSchema,
  messageInputSchema,
  rateInputSchema,
  type CustomRequest,
  type RequestStatus,
} from '@/features/custom-requests';
import type { User } from '@/features/auth';
import { addDays } from '@/shared/lib/dates';
import { createId } from '@/shared/lib/id';
import { getControls } from '../controls';
import { scriptedReply, type StoredRequest } from '../fixtures/requests';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';
import { effectiveWallet } from './wallet.handlers';

/** Drops the owner id and upgrades requests saved before F4 (they only had a status). */
export function toClient(stored: StoredRequest): CustomRequest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped on purpose
  const { ownerId, ...request } = stored;
  return {
    ...request,
    objective: request.objective ?? null,
    questions: request.questions ?? [],
    quote: request.quote ?? null,
    timeline: request.timeline ?? [
      { status: 'quote_requested', at: request.createdAt, note: null },
    ],
    messages: request.messages ?? [],
    progress: request.progress ?? {
      interviewsDone: 0,
      interviewsPlanned: 0,
      experts: [],
      estimatedDelivery: null,
    },
    delivery: request.delivery ?? null,
    declineReason: request.declineReason ?? null,
    updatedAt: request.updatedAt ?? request.createdAt,
  };
}

export function withStatus(
  request: StoredRequest,
  status: RequestStatus,
  now: Date,
  note: string | null = null,
): StoredRequest {
  return {
    ...request,
    status,
    timeline: [...(request.timeline ?? []), { status, at: now.toISOString(), note }],
    updatedAt: now.toISOString(),
  };
}

async function guard() {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return { response: unauthorized() } as const;
  const failure = injectedError();
  if (failure) return { response: failure } as const;
  return { user } as const;
}

function ownRequest(id: unknown, user: User): StoredRequest | null {
  const request = typeof id === 'string' ? db.get().requests[id] : undefined;
  return request && request.ownerId === user.id ? request : null;
}

const notFound = () =>
  errorResponse(404, 'not_found', 'We couldn’t find that request. It may have been withdrawn.');

function save(request: StoredRequest) {
  db.update((draft) => {
    draft.requests[request.id] = request;
  });
  return HttpResponse.json(toClient(request));
}

export const requestsHandlers = [
  http.get('/api/requests', async () => {
    const result = await guard();
    if ('response' in result) return result.response;
    if (getControls().emptyData) return HttpResponse.json([]);
    const list = Object.values(db.get().requests)
      .filter((r) => r.ownerId === result.user.id)
      .map(toClient)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return HttpResponse.json(list);
  }),

  http.get('/api/requests/:requestId', async ({ params }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const request = ownRequest(params.requestId, result.user);
    return request ? HttpResponse.json(toClient(request)) : notFound();
  }),

  /** Accepting holds the quoted credits; they're spent on delivery (F4, F6). */
  http.post('/api/requests/:requestId/accept', async ({ params }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const { user } = result;
    const request = ownRequest(params.requestId, user);
    if (!request) return notFound();
    const quote = request.quote;
    const now = new Date();
    if (request.status !== 'quote_ready' || !quote) {
      return errorResponse(409, 'invalid_state', 'This quote can’t be accepted any more.');
    }
    if (quote.validUntil < now.toISOString()) {
      return errorResponse(410, 'quote_expired', 'This quote has expired. Ask for a new one.');
    }
    const wallet = effectiveWallet(user.id);
    if (quote.credits > wallet.balance) {
      return errorResponse(
        402,
        'insufficient_credits',
        `You need ${quote.credits - wallet.balance} more credits to accept this quote. Top up, then accept.`,
      );
    }
    const accepted: StoredRequest = {
      ...withStatus(request, 'accepted', now, `${quote.credits} credits held`),
      progress: {
        ...request.progress,
        interviewsPlanned: quote.experts,
        estimatedDelivery: addDays(now, quote.etaDays).toISOString(),
      },
    };
    db.update((draft) => {
      draft.requests[request.id] = accepted;
      const stored = (draft.wallets[user.id] ??= { balance: 0, held: 0, transactions: [] });
      stored.balance -= quote.credits;
      stored.held += quote.credits;
      stored.transactions.unshift({
        id: createId('txn'),
        type: 'hold',
        amount: -quote.credits,
        description: `Held: ${request.title}`,
        at: now.toISOString(),
      });
    });
    return HttpResponse.json(toClient(accepted));
  }),

  http.post('/api/requests/:requestId/decline', async ({ params, request: http }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const request = ownRequest(params.requestId, result.user);
    if (!request) return notFound();
    const parsed = declineInputSchema.safeParse(await http.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Choose a reason.');
    if (request.status !== 'quote_ready' && request.status !== 'expired') {
      return errorResponse(409, 'invalid_state', 'This quote can’t be declined any more.');
    }
    const reason = [parsed.data.reason, parsed.data.comment].filter(Boolean).join('. ');
    return save({ ...withStatus(request, 'declined', new Date(), reason), declineReason: reason });
  }),

  /** Ask for a fresh quote after one expired or was declined. */
  http.post('/api/requests/:requestId/requote', async ({ params }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const request = ownRequest(params.requestId, result.user);
    if (!request) return notFound();
    if (request.status !== 'expired' && request.status !== 'declined') {
      return errorResponse(409, 'invalid_state', 'This request already has a live quote.');
    }
    return save({
      ...withStatus(request, 'quote_requested', new Date(), 'New quote requested'),
      quote: null,
      declineReason: null,
    });
  }),

  /** Cancel before interviews start; held credits come back in full. */
  http.post('/api/requests/:requestId/cancel', async ({ params }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const { user } = result;
    const request = ownRequest(params.requestId, user);
    if (!request) return notFound();
    const credits = request.quote?.credits ?? 0;
    if (!['accepted', 'recruiting'].includes(request.status)) {
      return errorResponse(
        409,
        'invalid_state',
        'Interviews have started, so this request can’t be cancelled here. Message us instead.',
      );
    }
    const now = new Date();
    const cancelled = withStatus(request, 'cancelled', now, `${credits} credits refunded`);
    db.update((draft) => {
      draft.requests[request.id] = cancelled;
      const stored = draft.wallets[user.id];
      if (stored) {
        stored.held = Math.max(0, stored.held - credits);
        stored.balance += credits;
        stored.transactions.unshift({
          id: createId('txn'),
          type: 'refund',
          amount: credits,
          description: `Refund: ${request.title} (cancelled)`,
          at: now.toISOString(),
        });
      }
    });
    return HttpResponse.json(toClient(cancelled));
  }),

  http.post('/api/requests/:requestId/messages', async ({ params, request: http }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const request = ownRequest(params.requestId, result.user);
    if (!request) return notFound();
    const parsed = messageInputSchema.safeParse(await http.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Write a question first.');
    const now = new Date();
    return save({
      ...request,
      messages: [
        ...(request.messages ?? []),
        { id: createId('msg'), author: 'client', text: parsed.data.text, at: now.toISOString() },
        {
          id: createId('msg'),
          author: 'xpert',
          text: scriptedReply(parsed.data.text),
          at: new Date(now.getTime() + 60_000).toISOString(),
        },
      ],
      updatedAt: now.toISOString(),
    });
  }),

  http.post('/api/requests/:requestId/rate', async ({ params, request: http }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const request = ownRequest(params.requestId, result.user);
    if (!request?.delivery) return notFound();
    const parsed = rateInputSchema.safeParse(await http.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Choose a rating from 1 to 5.');
    return save({ ...request, delivery: { ...request.delivery, rating: parsed.data.rating } });
  }),
];
