import type { ChatMessage, ResearchBrief, TurnResult } from '@/features/goal-chat';
import type { User } from '@/features/auth';
import type { ClientOnboarding, ExpertOnboarding } from '@/features/onboarding';
import type { Wallet } from '@/features/wallet';
import { USERS } from '../fixtures/users';
import { SEED_CLIENT_ONBOARDING, SEED_EXPERT_ONBOARDING } from '../fixtures/onboarding';
import { SEED_OWNED_REPORTS, seedWallet } from '../fixtures/wallet';

/** A custom research request created from a brief (F4 builds on this). */
export type MockRequest = {
  id: string;
  briefId: string;
  ownerId: string;
  title: string;
  questionIds: string[];
  status: 'quote_requested';
  createdAt: string;
};

export type DemoState = {
  version: 2;
  sessionUserId: string | null;
  /** Demo personas plus accounts created through sign-up (F0). */
  users: Record<string, User>;
  /** Last verification email sent, per user (F0 verify-email notice). */
  verificationSentAt: Record<string, string>;
  clientOnboarding: Record<string, ClientOnboarding>;
  expertOnboarding: Record<string, ExpertOnboarding>;
  briefs: Record<string, ResearchBrief>;
  messages: Record<string, ChatMessage[]>;
  /** Completed turns by turnId, so retried turns are idempotent. */
  turns: Record<string, TurnResult>;
  wallets: Record<string, Wallet>;
  ownedReports: Record<string, string[]>;
  requests: Record<string, MockRequest>;
};

const STORAGE_KEY = 'proptyop.demo.v2';

function seed(): DemoState {
  const clientIds = Object.values(USERS)
    .filter((user) => user.role === 'client')
    .map((user) => user.id);
  return {
    version: 2,
    sessionUserId: null,
    users: Object.fromEntries(Object.values(USERS).map((user) => [user.id, user])),
    verificationSentAt: {},
    clientOnboarding: structuredClone(SEED_CLIENT_ONBOARDING),
    expertOnboarding: structuredClone(SEED_EXPERT_ONBOARDING),
    briefs: {},
    messages: {},
    turns: {},
    wallets: Object.fromEntries(clientIds.map((id) => [id, seedWallet(id)])),
    ownedReports: Object.fromEntries(clientIds.map((id) => [id, SEED_OWNED_REPORTS[id] ?? []])),
    requests: {},
  };
}

function load(): DemoState {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as DemoState;
    // Slices added after a tester's data was saved fall back to the seed.
    return parsed.version === 2 ? { ...seed(), ...parsed } : seed();
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
