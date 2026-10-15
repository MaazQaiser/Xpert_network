import type { AuthProvider, SignUpRole, User } from '@/features/auth';
import { createId } from '@/shared/lib/id';
import { welcomeNotification } from '../fixtures/notifications';
import { newClientOnboarding, newExpertOnboarding } from '../fixtures/onboarding';
import { DEFAULT_PROFILE_EXTRAS, defaultPreferences, defaultSecurity } from '../fixtures/profile';
import { db, type DemoState } from './db';

type NewAccount = {
  role: SignUpRole;
  name: string;
  email: string;
  title?: string;
  organisation?: string;
  provider: AuthProvider;
  emailVerified: boolean;
};

export function findUserByEmail(email: string): User | null {
  const normalised = email.trim().toLowerCase();
  return Object.values(db.get().users).find((u) => u.email.toLowerCase() === normalised) ?? null;
}

/** Every per-user slice a brand-new account needs, so later flows find their data. */
const initialisers: ((draft: DemoState, user: User) => void)[] = [
  (draft, user) => {
    if (user.role === 'client') draft.wallets[user.id] = { balance: 0, held: 0, transactions: [] };
  },
  (draft, user) => {
    if (user.role === 'client') draft.clientOnboarding[user.id] = newClientOnboarding();
    if (user.role === 'expert') draft.expertOnboarding[user.id] = newExpertOnboarding();
  },
  (draft, user) => {
    draft.profiles[user.id] = { ...DEFAULT_PROFILE_EXTRAS };
    draft.preferences[user.id] = defaultPreferences(user.role);
    draft.security[user.id] = defaultSecurity(new Date(), false);
    draft.notifications[user.id] = [welcomeNotification(user.role)];
  },
];

/** Creates an account (sign-up or first OAuth login) and logs it in. */
export function createAccount(input: NewAccount): User {
  const user: User = {
    id: createId('usr'),
    personaId: null,
    role: input.role,
    name: input.name.trim(),
    title: input.title ?? '',
    organisation: input.organisation ?? '',
    email: input.email.trim().toLowerCase(),
    emailVerified: input.emailVerified,
    provider: input.provider,
  };
  db.update((draft) => {
    draft.users[user.id] = user;
    draft.sessionUserId = user.id;
    if (!user.emailVerified) draft.verificationSentAt[user.id] = new Date().toISOString();
    for (const init of initialisers) init(draft, user);
  });
  return user;
}
