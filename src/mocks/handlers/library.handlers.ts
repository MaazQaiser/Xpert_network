import { http, HttpResponse } from 'msw';
import {
  askInputSchema,
  filtersFromParams,
  type LibraryEntry,
  type LibraryItem,
  type ReportAnswer,
} from '@/features/library';
import type { User } from '@/features/auth';
import { createId } from '@/shared/lib/id';
import { answerQuestion, starterPrompts } from '../ai/reportQa/engine';
import { getControls } from '../controls';
import { COMPANIES, REGIONS } from '../fixtures/entities';
import { LIBRARY_ITEMS } from '../fixtures/library';
import { REPORT_CONTENT, type MockReport } from '../fixtures/reportContent';
import { SEED_PURCHASED_AT } from '../fixtures/wallet';
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

/** Answers by turnId, so a retried question is idempotent (session memory only). */
const answers = new Map<string, ReportAnswer>();

function contentFor(item: LibraryItem): MockReport {
  const content = REPORT_CONTENT[item.id] ?? db.get().customReports[item.id]?.content;
  if (!content) throw new Error(`No report content for ${item.id}`);
  return content;
}

export function libraryEntry(item: LibraryItem, userId: string): LibraryEntry {
  const content = contentFor(item);
  const update = db.get().reportUpdates[item.id];
  const updatedAt = update?.updatedAt ?? content.updatedAt;
  const owned = (db.get().ownedReports[userId] ?? []).includes(item.id);
  const purchasedAt = owned
    ? (db.get().reportPurchases[userId]?.[item.id] ?? SEED_PURCHASED_AT)
    : null;
  return {
    ...item,
    owned,
    purchasedAt,
    updatedAt,
    updateNote: update?.note ?? content.updateNote,
    // ISO strings compare in time order; a bare date sorts before any time that day.
    updatedSincePurchase: Boolean(purchasedAt && updatedAt > purchasedAt),
    readMinutes: content.readMinutes,
    sampleChart: content.sampleChart,
  };
}

/** A region filter matches the region itself, anything inside it, or anything containing it. */
function regionFamily(regionId: string): Set<string> {
  const family = new Set([regionId]);
  let parent = REGIONS.find((r) => r.id === regionId)?.parentId ?? null;
  while (parent) {
    family.add(parent);
    parent = REGIONS.find((r) => r.id === parent)?.parentId ?? null;
  }
  const addChildren = (id: string) =>
    REGIONS.filter((r) => r.parentId === id).forEach((child) => {
      family.add(child.id);
      addChildren(child.id);
    });
  addChildren(regionId);
  return family;
}

function searchText(item: LibraryItem): string {
  const regions = item.regionIds.map((id) => REGIONS.find((r) => r.id === id)?.label ?? '');
  const companies = item.companyIds.map((id) => COMPANIES.find((c) => c.id === id)?.label ?? '');
  const sections = item.toc.map((s) => s.title);
  return [
    item.title,
    item.summary,
    item.category.industry,
    item.category.subIndustry,
    ...regions,
    ...companies,
    ...sections,
  ]
    .join(' ')
    .toLowerCase();
}

async function guardClient() {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return { response: unauthorized() } as const;
  const failure = injectedError();
  if (failure) return { response: failure } as const;
  return { user } as const;
}

/** Public library items, plus delivered custom reports (readable only by their owner). */
function findItem(id: unknown): LibraryItem | null {
  if (typeof id !== 'string') return null;
  return LIBRARY_ITEMS.find((item) => item.id === id) ?? db.get().customReports[id]?.item ?? null;
}

const notFound = () =>
  errorResponse(404, 'not_found', 'We couldn’t find that report. It may have been withdrawn.');

function ownsItem(user: User, itemId: string) {
  return (db.get().ownedReports[user.id] ?? []).includes(itemId);
}

export const libraryHandlers = [
  http.get('/api/library', async ({ request }) => {
    const result = await guardClient();
    if ('response' in result) return result.response;
    const { user } = result;
    const filters = filtersFromParams(new URL(request.url).searchParams);
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    const regionSets = filters.regionIds.map(regionFamily);

    const items = getControls().emptyData
      ? []
      : LIBRARY_ITEMS.filter((item) => {
          const text = searchText(item);
          if (!terms.every((term) => text.includes(term))) return false;
          if (filters.industry && item.category.industry !== filters.industry) return false;
          if (
            regionSets.length &&
            !regionSets.some((set) => item.regionIds.some((id) => set.has(id)))
          )
            return false;
          if (filters.maxPrice && item.priceCredits > filters.maxPrice) return false;
          if (filters.ownedOnly && !ownsItem(user, item.id)) return false;
          return true;
        })
          .map((item) => libraryEntry(item, user.id))
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    const regionIds = new Set(LIBRARY_ITEMS.flatMap((item) => item.regionIds));
    return HttpResponse.json({
      items,
      facets: {
        industries: [...new Set(LIBRARY_ITEMS.map((item) => item.category.industry))].sort(),
        regions: REGIONS.filter((r) => regionIds.has(r.id)).map(({ id, label }) => ({ id, label })),
      },
    });
  }),

  http.get('/api/library/:itemId', async ({ params }) => {
    const result = await guardClient();
    if ('response' in result) return result.response;
    const item = findItem(params.itemId);
    if (!item) return notFound();
    return HttpResponse.json(libraryEntry(item, result.user.id));
  }),

  http.post('/api/library/:itemId/purchase', async ({ params }) => {
    const result = await guardClient();
    if ('response' in result) return result.response;
    const { user } = result;
    const item = findItem(params.itemId);
    if (!item) return notFound();
    if (ownsItem(user, item.id)) {
      return errorResponse(
        409,
        'already_owned',
        'You already own this report. Open it from the library.',
      );
    }
    const wallet = effectiveWallet(user.id);
    if (item.priceCredits > wallet.balance) {
      return errorResponse(
        402,
        'insufficient_credits',
        `You need ${item.priceCredits - wallet.balance} more credits to buy this report. Top up, then try again.`,
      );
    }
    const now = new Date().toISOString();
    db.update((draft) => {
      draft.ownedReports[user.id] = [...(draft.ownedReports[user.id] ?? []), item.id];
      (draft.reportPurchases[user.id] ??= {})[item.id] = now;
      const stored = (draft.wallets[user.id] ??= { balance: 0, held: 0, transactions: [] });
      stored.balance -= item.priceCredits;
      stored.transactions.unshift({
        id: createId('txn'),
        type: 'purchase',
        amount: -item.priceCredits,
        description: item.title,
        at: now,
      });
    });
    return HttpResponse.json({
      entry: libraryEntry(item, user.id),
      balance: effectiveWallet(user.id).balance,
    });
  }),

  http.get('/api/library/:itemId/content', async ({ params }) => {
    const result = await guardClient();
    if ('response' in result) return result.response;
    const item = findItem(params.itemId);
    if (!item) return notFound();
    if (!ownsItem(result.user, item.id)) {
      return errorResponse(403, 'not_owned', 'Buy this report to read it in full.');
    }
    const content = contentFor(item);
    const sections = content.sections.map(({ keywords: _keywords, ...section }) => section);
    return HttpResponse.json({
      entry: libraryEntry(item, result.user.id),
      sections,
      starterQuestions: starterPrompts(content),
    });
  }),

  /** "Ask this report", streamed as NDJSON (shared/ai/protocol.ts). */
  http.post('/api/library/:itemId/ask', async ({ params, request }) => {
    const user = currentUser();
    if (!user) return unauthorized();
    const item = findItem(params.itemId);
    if (!item) return notFound();
    if (!ownsItem(user, item.id)) {
      return errorResponse(403, 'not_owned', 'Buy this report to ask questions about it.');
    }
    const parsed = askInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(422, 'invalid_input', 'Ask a question of at least a few words.');
    }
    const { turnId, question } = parsed.data;
    const previous = answers.get(turnId);
    const { steps, answer } = previous
      ? { steps: [] as string[], answer: previous }
      : answerQuestion(contentFor(item), question, createId('ans'));

    const failMidStream = getControls().apiError;
    return ndjsonStream(async (send, pause) => {
      for (const label of steps) {
        send({ type: 'step', label });
        await pause(550);
      }
      const tokens = tokenise(answer.text);
      const cutoff = failMidStream ? Math.ceil(tokens.length / 2) : tokens.length;
      for (const token of tokens.slice(0, cutoff)) {
        send({ type: 'token', text: token });
        await pause(24);
      }
      if (failMidStream) {
        send({
          type: 'error',
          code: 'stream_interrupted',
          message:
            'The answer was cut off by a connection problem. Your question is still here. Try again.',
        });
        return;
      }
      if (request.signal.aborted) return;
      answers.set(turnId, answer);
      send({ type: 'done', result: answer });
    });
  }),
];
