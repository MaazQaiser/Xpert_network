import {
  seedInbox,
  seedListProjects,
  seedMailAccounts,
  seedProjects,
} from '@/mocks/fixtures/admin/seed';
import { db, type DemoState } from '@/mocks/store/db';

/**
 * The app starts with no emails or mailboxes. Tests still run the admin flows on the demo set
 * (Jenna Cho's headphones brief, PRJ-1042 and friends).
 */
export function adminDemoState(
  now = new Date(),
): Pick<DemoState, 'adminInbox' | 'adminMailAccounts' | 'adminProjects'> {
  return {
    adminInbox: seedInbox(now),
    adminMailAccounts: seedMailAccounts(now),
    adminProjects: seedProjects(now),
  };
}

/** Loads the demo set into the mock store (run before every test by setup.tsx). */
export function loadAdminDemo(now = new Date()) {
  const demo = adminDemoState(now);
  db.update((draft) => Object.assign(draft, demo));
}

/** Adds the projects built on GetSales lists (PRJ-1045), which the demo set leaves out. */
export function loadListProjects(now = new Date()) {
  db.update((draft) => {
    Object.assign(draft.adminProjects, seedListProjects(now));
  });
}
