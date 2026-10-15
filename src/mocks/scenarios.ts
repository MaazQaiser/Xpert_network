import type { Notification } from '@/features/notifications';
import { createId } from '@/shared/lib/id';
import { LIBRARY_ITEMS } from './fixtures/library';
import { demoNotification } from './fixtures/notifications';
import {
  DEMO_REJECTION_NOTE,
  newClientOnboarding,
  newExpertOnboarding,
} from './fixtures/onboarding';
import { db } from './store/db';

function notify(userId: string, notification: Notification) {
  db.update((draft) => {
    draft.notifications[userId] = [notification, ...(draft.notifications[userId] ?? [])];
  });
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
      body: `${title} — new figures for 2026.`,
      href: `/library/${itemId}/read`,
      read: false,
      createdAt: now.toISOString(),
    });
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
};
