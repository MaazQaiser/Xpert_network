import {
  seedHomeStories,
  type ChatMessage,
  type ResearchBrief,
  type TurnResult,
} from '@/features/goal-chat';
import type { User } from '@/features/auth';
import type { Notification } from '@/features/notifications';
import type { ClientOnboarding, ExpertOnboarding } from '@/features/onboarding';
import type { NotificationPreferences, Security } from '@/features/profile';
import type { Wallet } from '@/features/wallet';
import { USERS } from '../fixtures/users';
import { seedNotifications } from '../fixtures/notifications';
import type { LibraryItem } from '@/features/library';
import type { MockReport } from '../fixtures/reportContent';
import { seedCustomReports, seedRequests, type StoredRequest } from '../fixtures/requests';
import { SEED_CLIENT_ONBOARDING, SEED_EXPERT_ONBOARDING } from '../fixtures/onboarding';
import {
  defaultPreferences,
  defaultSecurity,
  SEED_PROFILE_EXTRAS,
  type ProfileExtras,
} from '../fixtures/profile';
import { SEED_OWNED_REPORTS, SEED_PURCHASES, seedWallet } from '../fixtures/wallet';
import { SEED_WORKSPACES, type StoredWorkspace } from '../fixtures/workspace';
import { SEED_APPLICATIONS } from '../fixtures/calls';
import { SEED_EARNINGS, type StoredEarnings } from '../fixtures/earnings';
import type { StoredInterview } from '../ai/interviewer/engine';
import type { InboxRequest, MatchResult, Project, Shortlist } from '@/features/admin';
import { seedInbox, seedProjects, type SentMail } from '../fixtures/admin/seed';

export type DemoState = {
  version: 2;
  sessionUserId: string | null;
  /** Demo personas plus accounts created through sign-up (F0). */
  users: Record<string, User>;
  /** Last verification email sent, per user (F0 verify-email notice). */
  verificationSentAt: Record<string, string>;
  clientOnboarding: Record<string, ClientOnboarding>;
  expertOnboarding: Record<string, ExpertOnboarding>;
  /** F17: profile fields that aren't on the user record. */
  profiles: Record<string, ProfileExtras>;
  preferences: Record<string, NotificationPreferences>;
  security: Record<string, Security>;
  notifications: Record<string, Notification[]>;
  briefs: Record<string, ResearchBrief>;
  messages: Record<string, ChatMessage[]>;
  /** Completed turns by turnId, so retried turns are idempotent. */
  turns: Record<string, TurnResult>;
  wallets: Record<string, Wallet>;
  ownedReports: Record<string, string[]>;
  /** When each owned report was bought, per user (F3 "updated since you bought it"). */
  reportPurchases: Record<string, Record<string, string>>;
  /** Report updates pushed by the toolbar scenario, by library item id. */
  reportUpdates: Record<string, { updatedAt: string; note: string }>;
  requests: Record<string, StoredRequest>;
  /** Delivered custom reports, readable in the F3 viewer by their owner. */
  customReports: Record<string, { ownerId: string; item: LibraryItem; content: MockReport }>;
  /** F5: each client's folders, labels and per-item organisation. */
  workspaces: Record<string, StoredWorkspace>;
  /** F8: each expert's applications by call id, with their screening answers. */
  applications: Record<string, Record<string, StoredApplication>>;
  /** F9: interviews by id. */
  interviews: Record<string, StoredInterview>;
  /** F10: each expert's earnings, payouts and payout method. */
  earnings: Record<string, StoredEarnings>;
  /** F12: client emails in the connected projects inbox, by id. */
  adminInbox: Record<string, InboxRequest>;
  /** F12+: projects by id (PRJ-1042). */
  adminProjects: Record<string, Project>;
  /** Email sandbox: everything the PM "sent". Nothing leaves the browser. */
  adminMail: SentMail[];
  /** F13: matched experts per project, filled when the brief is approved. */
  adminMatches: Record<string, MatchResult>;
  /** F13: AI shortlist per project, filled when the PM generates one. */
  adminShortlists: Record<string, Shortlist>;
};

export type StoredApplication = {
  status: 'applied' | 'approved' | 'not_eligible';
  at: string;
  note: string | null;
  interviewId: string | null;
  answers: Record<string, string>;
};

// Key keeps the product's former name so testers' saved demo data survives the rename.
const STORAGE_KEY = 'proptyop.demo.v2';

/** Seeded delivered reports belong to the client who commissioned them. */
function withCustomReports(
  state: Pick<DemoState, 'ownedReports' | 'reportPurchases'>,
  reports: DemoState['customReports'],
) {
  for (const [id, { ownerId, content }] of Object.entries(reports)) {
    const owned = (state.ownedReports[ownerId] ??= []);
    if (!owned.includes(id)) owned.push(id);
    (state.reportPurchases[ownerId] ??= {})[id] ??= content.updatedAt;
  }
}

function seed(): DemoState {
  const clientIds = Object.values(USERS)
    .filter((user) => user.role === 'client')
    .map((user) => user.id);
  const requests = seedRequests();
  const customReports = seedCustomReports(requests);
  const homeStories = seedHomeStories();
  const state: DemoState = {
    version: 2,
    sessionUserId: null,
    users: Object.fromEntries(Object.values(USERS).map((user) => [user.id, user])),
    verificationSentAt: {},
    clientOnboarding: structuredClone(SEED_CLIENT_ONBOARDING),
    expertOnboarding: structuredClone(SEED_EXPERT_ONBOARDING),
    profiles: structuredClone(SEED_PROFILE_EXTRAS),
    preferences: Object.fromEntries(
      Object.values(USERS).map((user) => [user.id, defaultPreferences(user.role)]),
    ),
    security: Object.fromEntries(Object.values(USERS).map((user) => [user.id, defaultSecurity()])),
    notifications: Object.fromEntries(
      Object.values(USERS).map((user) => [user.id, seedNotifications(user.id)]),
    ),
    briefs: homeStories.briefs,
    messages: homeStories.messages,
    turns: {},
    wallets: Object.fromEntries(clientIds.map((id) => [id, seedWallet(id)])),
    ownedReports: Object.fromEntries(clientIds.map((id) => [id, SEED_OWNED_REPORTS[id] ?? []])),
    reportPurchases: Object.fromEntries(
      clientIds.map((id) => [
        id,
        Object.fromEntries((SEED_PURCHASES[id] ?? []).map((p) => [p.itemId, p.at])),
      ]),
    ),
    reportUpdates: {},
    requests,
    customReports,
    workspaces: structuredClone(SEED_WORKSPACES),
    applications: structuredClone(SEED_APPLICATIONS),
    interviews: {},
    earnings: structuredClone(SEED_EARNINGS),
    adminInbox: seedInbox(),
    adminProjects: seedProjects(),
    adminMail: [],
    adminMatches: {},
    adminShortlists: {},
  };
  withCustomReports(state, customReports);
  return state;
}

/** Persona names and emails follow the fixtures, so a renamed persona shows up in saved demos. */
function withPersonaIdentity(saved: DemoState['users'] | undefined): DemoState['users'] {
  const users = { ...(saved ?? {}) };
  for (const persona of Object.values(USERS)) {
    const user = users[persona.id];
    users[persona.id] = user
      ? { ...user, name: persona.name, title: persona.title, email: persona.email }
      : persona;
  }
  return users;
}

/** Adds seeded requests and refreshes home-story chats a tester's saved data predates. */
function withNewSeeds(saved: DemoState, fresh: DemoState): DemoState {
  const missingRequests = Object.values(fresh.requests).filter((r) => !saved.requests?.[r.id]);
  const storyBriefs = Object.values(fresh.briefs).filter((brief) => {
    const savedCount = saved.messages?.[brief.id]?.length ?? 0;
    const freshCount = fresh.messages[brief.id]?.length ?? 0;
    return !saved.briefs?.[brief.id] || savedCount < freshCount;
  });
  const needsAdminSlices = !saved.adminMatches || !saved.adminShortlists;
  if (missingRequests.length === 0 && storyBriefs.length === 0 && !needsAdminSlices) {
    return saved;
  }
  const reports = Object.fromEntries(
    Object.entries(fresh.customReports).filter(([, report]) =>
      missingRequests.some((r) => r.delivery?.reportId === report.item.id),
    ),
  );
  const merged: DemoState = {
    ...saved,
    adminMatches: saved.adminMatches ?? {},
    adminShortlists: saved.adminShortlists ?? {},
    requests: {
      ...saved.requests,
      ...Object.fromEntries(missingRequests.map((r) => [r.id, r])),
    },
    briefs: {
      ...(saved.briefs ?? {}),
      ...Object.fromEntries(storyBriefs.map((b) => [b.id, b])),
    },
    messages: {
      ...(saved.messages ?? {}),
      ...Object.fromEntries(storyBriefs.map((b) => [b.id, fresh.messages[b.id] ?? []])),
    },
    customReports: { ...saved.customReports, ...reports },
    ownedReports: structuredClone(saved.ownedReports ?? {}),
    reportPurchases: structuredClone(saved.reportPurchases ?? {}),
  };
  withCustomReports(merged, reports);
  return merged;
}

function load(): DemoState {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as DemoState;
    // Slices added after a tester's data was saved fall back to the seed.
    if (parsed.version !== 2) return seed();
    const fresh = seed();
    return withNewSeeds({ ...fresh, ...parsed, users: withPersonaIdentity(parsed.users) }, fresh);
  } catch {
    return seed();
  }
}

let state: DemoState = load();

/** In-memory store persisted to localStorage so a tester's session survives reloads. */
export const db = {
  get(): DemoState {
    return state;
  },
  update(mutate: (draft: DemoState) => void): DemoState {
    const draft = structuredClone(state);
    mutate(draft);
    state = draft;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
  },
  /** Reset demo: wipe everything back to the seed (toolbar "Reset demo"). */
  reset(): void {
    state = seed();
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  },
};
