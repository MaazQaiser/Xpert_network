import {
  DEMO_REJECTION_NOTE,
  newClientOnboarding,
  newExpertOnboarding,
} from './fixtures/onboarding';
import { db } from './store/db';

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
    return true;
  },
};
