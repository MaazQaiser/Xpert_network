import type { Notification } from '@/features/notifications';
import { createId } from '@/shared/lib/id';
import { LIBRARY_ITEMS } from './fixtures/library';
import { demoNotification } from './fixtures/notifications';
import {
  DEMO_REJECTION_NOTE,
  newClientOnboarding,
  newExpertOnboarding,
} from './fixtures/onboarding';
import { approveOldestApplication } from './handlers/calls.handlers';
import { payOldestPayout } from './handlers/earnings.handlers';
import {
  decideOldestInterview,
  dropNextInterviewTurn,
  pauseLongAgo,
} from './handlers/interviews.handlers';
import { withStatus } from './handlers/requests.handlers';
import {
  buildCustomReport,
  buildQuote,
  EXPERT_POOL,
  type StoredRequest,
} from './fixtures/requests';
import { db } from './store/db';

function notify(userId: string, notification: Notification) {
  db.update((draft) => {
    draft.notifications[userId] = [notification, ...(draft.notifications[userId] ?? [])];
  });
}

/** The current client's most recently updated request still in progress. */
function latestOpenRequest(): StoredRequest | null {
  const id = db.get().sessionUserId;
  const open = Object.values(db.get().requests)
    .filter((r) => r.ownerId === id && !['delivered', 'declined', 'cancelled'].includes(r.status))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  return open[0] ?? null;
}

function saveRequest(request: StoredRequest) {
  db.update((draft) => {
    draft.requests[request.id] = request;
  });
}

/** Delivers a request: spends held credits, refunds missing interviews, adds the report. */
function deliver(request: StoredRequest, now: Date, partial: boolean): StoredRequest {
  const credits = request.quote?.credits ?? 0;
  const planned = request.progress.interviewsPlanned || request.quote?.experts || 1;
  const done = partial ? Math.max(1, planned - 2) : planned;
  const refund = Math.round((credits * (planned - done)) / planned);
  const experts = request.progress.experts.slice(0, done);
  const { item, content } = buildCustomReport(request, experts, now);
  const delivered: StoredRequest = {
    ...withStatus(
      request,
      'delivered',
      now,
      partial ? `${done} of ${planned} interviews; ${refund} credits refunded` : null,
    ),
    progress: { ...request.progress, interviewsDone: done },
    delivery: { reportId: item.id, partial, refundCredits: refund, rating: null },
  };
  db.update((draft) => {
    draft.requests[request.id] = delivered;
    draft.customReports[item.id] = { ownerId: request.ownerId, item, content };
    draft.ownedReports[request.ownerId] = [...(draft.ownedReports[request.ownerId] ?? []), item.id];
    (draft.reportPurchases[request.ownerId] ??= {})[item.id] = now.toISOString();
    const wallet = draft.wallets[request.ownerId];
    if (wallet) {
      wallet.held = Math.max(0, wallet.held - credits);
      wallet.balance += refund;
      wallet.transactions.unshift({
        id: createId('txn'),
        type: 'spent',
        amount: -(credits - refund),
        description: `Spent: ${request.title}`,
        at: now.toISOString(),
      });
      if (refund > 0) {
        wallet.transactions.unshift({
          id: createId('txn'),
          type: 'refund',
          amount: refund,
          description: `Refund: ${planned - done} fewer interviews than quoted`,
          at: now.toISOString(),
        });
      }
    }
  });
  notify(request.ownerId, {
    id: createId('ntf'),
    event: 'request_update',
    title: partial ? 'Your research is delivered (partial)' : 'Your research is delivered',
    body: partial
      ? `${request.title}: ${done} of ${planned} interviews; ${refund} credits refunded.`
      : `${request.title}: read it now and ask it questions.`,
    href: `/requests/${request.id}`,
    read: false,
    createdAt: now.toISOString(),
  });
  return delivered;
}

/**
 * Scenario engine (PRODUCT_PLAN §8): toolbar actions that move time-based states forward
 * for the logged-in user. Returns false when the action doesn't apply.
 */
export const scenarios = {
  /** F1 / F7: start onboarding again from scratch. */
  restartOnboarding(): boolean {
    const id = db.get().sessionUserId;
    const user = id ? db.get().users[id] : undefined;
    if (!user || user.role === 'admin') return false;
    db.update((draft) => {
      if (user.role === 'client') draft.clientOnboarding[user.id] = newClientOnboarding();
      else draft.expertOnboarding[user.id] = newExpertOnboarding();
    });
    return true;
  },

  /** F7: an admin decides a pending application (F12 will do this for real). */
  decideExpert(decision: 'approved' | 'rejected'): boolean {
    const id = db.get().sessionUserId;
    const profile = id ? db.get().expertOnboarding[id] : undefined;
    if (!id || !profile || profile.status !== 'pending') return false;
    db.update((draft) => {
      draft.expertOnboarding[id] = {
        ...profile,
        status: decision,
        decidedAt: new Date().toISOString(),
        decisionNote: decision === 'rejected' ? DEMO_REJECTION_NOTE : null,
        updatedAt: new Date().toISOString(),
      };
    });
    notify(id, {
      id: createId('ntf'),
      event: 'vetting_update',
      title:
        decision === 'approved' ? 'You’re approved as an expert' : 'Changes needed on your profile',
      body:
        decision === 'approved'
          ? 'Open calls that match your expertise now appear on your home page.'
          : 'See what to change, then resubmit. Most profiles are approved after one round.',
      href: decision === 'approved' ? '/expert/home' : '/expert/pending',
      read: false,
      createdAt: new Date().toISOString(),
    });
    return true;
  },

  /** F3: the newest report the client owns gets updated (shows "updated since you bought it"). */
  updateOwnedReport(): boolean {
    const id = db.get().sessionUserId;
    const owned = id ? (db.get().ownedReports[id] ?? []) : [];
    const itemId = owned.at(-1);
    if (!id || !itemId) return false;
    const title = LIBRARY_ITEMS.find((item) => item.id === itemId)?.title ?? 'A report you own';
    const now = new Date();
    db.update((draft) => {
      draft.reportUpdates[itemId] = {
        updatedAt: now.toISOString(),
        note: 'Experts added new figures for 2026 to the first section.',
      };
    });
    notify(id, {
      id: createId('ntf'),
      event: 'report_published',
      title: 'A report you own was updated',
      body: `${title}: new figures for 2026.`,
      href: `/library/${itemId}/read`,
      read: false,
      createdAt: now.toISOString(),
    });
    return true;
  },

  /** F4: move the latest open request to its next stage (quote → … → delivered). */
  advanceRequest(): boolean {
    const request = latestOpenRequest();
    if (!request) return false;
    const now = new Date();
    switch (request.status) {
      case 'quote_requested': {
        saveRequest({
          ...withStatus(request, 'quote_ready', now),
          quote: buildQuote(request, now),
        });
        notify(request.ownerId, {
          id: createId('ntf'),
          event: 'quote_ready',
          title: 'Your quote is ready',
          body: `${request.title}: review the scope, timeline and credits.`,
          href: `/requests/${request.id}`,
          read: false,
          createdAt: now.toISOString(),
        });
        return true;
      }
      case 'accepted': {
        saveRequest({
          ...withStatus(request, 'recruiting', now),
          progress: { ...request.progress, experts: EXPERT_POOL.slice(0, 2) },
        });
        return true;
      }
      case 'recruiting': {
        const planned = request.progress.interviewsPlanned || request.quote?.experts || 4;
        saveRequest({
          ...withStatus(request, 'interviews', now, `1 of ${planned} interviews done`),
          progress: {
            ...request.progress,
            experts: EXPERT_POOL.slice(0, planned),
            interviewsDone: 1,
          },
        });
        return true;
      }
      case 'interviews': {
        const { interviewsDone, interviewsPlanned } = request.progress;
        if (interviewsDone + 1 < interviewsPlanned) {
          saveRequest({
            ...request,
            progress: { ...request.progress, interviewsDone: interviewsDone + 1 },
            updatedAt: now.toISOString(),
          });
        } else {
          saveRequest({
            ...withStatus(request, 'analysis', now, 'All interviews done'),
            progress: { ...request.progress, interviewsDone: interviewsPlanned },
          });
        }
        return true;
      }
      case 'analysis':
        deliver(request, now, false);
        return true;
      default:
        return false;
    }
  },

  /** F4: the analyst revises the quote (cheaper, slower) after a question. */
  reviseQuote(): boolean {
    const request = latestOpenRequest();
    if (!request?.quote || !['quote_ready', 'expired'].includes(request.status)) return false;
    const now = new Date();
    const quote = buildQuote(request, now, request.quote.version + 1);
    saveRequest({
      ...withStatus(request, 'quote_ready', now, 'Quote revised'),
      quote: {
        ...quote,
        credits: Math.round(request.quote.credits * 0.85),
        experts: Math.max(3, request.quote.experts - 1),
        etaDays: request.quote.etaDays + 3,
        revisionNote: 'One fewer expert and 3 more days, for 15% fewer credits.',
      },
    });
    return true;
  },

  /** F4: the quote passes its validity date. */
  expireQuote(): boolean {
    const request = latestOpenRequest();
    if (!request?.quote || request.status !== 'quote_ready') return false;
    const now = new Date();
    saveRequest({
      ...withStatus(request, 'expired', now),
      quote: { ...request.quote, validUntil: new Date(now.getTime() - 60_000).toISOString() },
    });
    return true;
  },

  /** F4: deliver with fewer experts than quoted; the difference is refunded. */
  deliverPartially(): boolean {
    const request = latestOpenRequest();
    if (!request || !['interviews', 'analysis'].includes(request.status)) return false;
    deliver(request, new Date(), true);
    return true;
  },

  /** F17: a new notification arrives for the logged-in user (panel badge + toast). */
  pushNotification(): boolean {
    const id = db.get().sessionUserId;
    const user = id ? db.get().users[id] : undefined;
    if (!user) return false;
    notify(user.id, demoNotification(user.role));
    return true;
  },

  /** F8: an analyst approves the expert's oldest application under review. */
  approveApplication(): boolean {
    const id = expertId();
    return id ? approveOldestApplication(id) : false;
  },

  /** F9: the next interviewer reply is cut off, as if the connection dropped. */
  dropConnection(): boolean {
    if (!expertId()) return false;
    dropNextInterviewTurn();
    return true;
  },

  /** F9: the running interview has been paused for 15 minutes. */
  pauseLong(): boolean {
    const id = expertId();
    return id ? pauseLongAgo(id) : false;
  },

  /** F9 / F10: QA accepts or rejects the oldest submitted interview. */
  decideInterview(decision: 'accepted' | 'rejected'): boolean {
    const id = expertId();
    return id ? decideOldestInterview(id, decision) : false;
  },

  /** F10: the oldest requested payout is sent. */
  payoutPaid(): boolean {
    const id = expertId();
    return id ? payOldestPayout(id) : false;
  },
};

function expertId(): string | null {
  const id = db.get().sessionUserId;
  return id && db.get().users[id]?.role === 'expert' ? id : null;
}
