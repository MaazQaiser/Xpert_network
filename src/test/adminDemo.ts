import { seedInbox, seedMailAccounts, seedProjects } from '@/mocks/fixtures/admin/seed';
import { db, type DemoState } from '@/mocks/store/db';

/**
 * The app starts with no emails, mailboxes or projects. Tests still run the admin flows on the
 * demo set (Jenna Cho's headphones brief, PRJ-1042 and friends).
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
