import { http, HttpResponse } from 'msw';
import {
  loginInputSchema,
  oauthInputSchema,
  oauthProviderSchema,
  passwordResetConfirmSchema,
  passwordResetInputSchema,
  signUpInputSchema,
  type User,
} from '@/features/auth';
import { OAUTH_IDENTITIES } from '../fixtures/oauth';
import { USERS } from '../fixtures/users';
import { createAccount, findUserByEmail } from '../store/accounts';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const PROVIDER_LABEL = { google: 'Google', linkedin: 'LinkedIn' } as const;

function logIn(user: User) {
  db.update((draft) => {
    draft.sessionUserId = user.id;
  });
}

export const sessionHandlers = [
  http.get('/api/session', async () => {
    await simulateNetwork();
    return HttpResponse.json({ user: currentUser() });
  }),

  /** Demo persona login (toolbar, demo buttons) or email + password (any password works). */
  http.post('/api/session', async ({ request }) => {
    await simulateNetwork();
    const parsed = loginInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Enter your email and password.');
    if ('personaId' in parsed.data) {
      const persona = USERS[parsed.data.personaId];
      const user = db.get().users[persona.id] ?? persona;
      logIn(user);
      return HttpResponse.json({ user });
    }
    const failure = injectedError();
    if (failure) return failure;
    const { email, realm } = parsed.data;
    const user = findUserByEmail(email);
    if (!user) {
      return errorResponse(
        404,
        'account_not_found',
        'We couldn’t find an account with that email. Check it, or sign up.',
      );
    }
    if (realm === 'app' && user.role === 'admin') {
      return errorResponse(403, 'wrong_realm', 'Admin accounts log in through the admin console.');
    }
    if (realm === 'admin' && user.role !== 'admin') {
      return errorResponse(
        403,
        'wrong_realm',
        'This login is for Xpert Network staff. Clients and experts log in on the main site.',
      );
    }
    logIn(user);
    return HttpResponse.json({ user });
  }),

  http.delete('/api/session', async () => {
    await simulateNetwork();
    db.update((draft) => {
      draft.sessionUserId = null;
    });
    return HttpResponse.json({ user: null });
  }),
];

export const authHandlers = [
  http.post('/api/auth/sign-up', async ({ request }) => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    const parsed = signUpInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Check the highlighted fields and try again.');
    if (findUserByEmail(parsed.data.email)) {
      return errorResponse(
        409,
        'email_taken',
        'An account already uses this email. Log in instead, or reset your password.',
      );
    }
    const user = createAccount({ ...parsed.data, provider: 'email', emailVerified: false });
    return HttpResponse.json({ user }, { status: 201 });
  }),

  /** The mocked provider's account chooser. */
  http.get('/api/auth/oauth/:provider/accounts', async ({ params }) => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    const provider = oauthProviderSchema.safeParse(params.provider);
    if (!provider.success) return errorResponse(404, 'not_found', 'Unknown sign-in provider.');
    return HttpResponse.json(
      OAUTH_IDENTITIES[provider.data].map(({ name, email }) => ({ name, email })),
    );
  }),

  http.post('/api/auth/oauth', async ({ request }) => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    const parsed = oauthInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Choose an account.');
    const { provider, accountEmail, role } = parsed.data;
    const identity = OAUTH_IDENTITIES[provider].find((i) => i.email === accountEmail);
    if (!identity) return errorResponse(422, 'invalid_input', 'Choose an account.');

    const existing = findUserByEmail(identity.email);
    if (existing) {
      if (existing.role === 'admin') {
        return errorResponse(
          403,
          'wrong_realm',
          'Admin accounts log in through the admin console.',
        );
      }
      const verified = { ...existing, emailVerified: true };
      db.update((draft) => {
        draft.users[verified.id] = verified;
        draft.sessionUserId = verified.id;
      });
      return HttpResponse.json({ user: verified, isNew: false });
    }
    if (!role) {
      return errorResponse(
        404,
        'account_not_found',
        `No Xpert Network account uses ${identity.email} yet. Sign up with ${PROVIDER_LABEL[provider]} instead.`,
      );
    }
    const user = createAccount({ ...identity, role, provider, emailVerified: true });
    return HttpResponse.json({ user, isNew: true }, { status: 201 });
  }),

  /** Prototype stand-in for opening the link in the verification email. */
  http.post('/api/auth/verify-email', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const verified = { ...user, emailVerified: true };
    db.update((draft) => {
      draft.users[user.id] = verified;
    });
    return HttpResponse.json({ user: verified });
  }),

  http.post('/api/auth/verify-email/resend', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    const sentAt = new Date().toISOString();
    db.update((draft) => {
      draft.verificationSentAt[user.id] = sentAt;
    });
    return HttpResponse.json({ sentAt });
  }),

  /** Always succeeds, so the form never reveals which emails have accounts. */
  http.post('/api/auth/password-reset', async ({ request }) => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    const parsed = passwordResetInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Enter your email address.');
    return HttpResponse.json({ sentAt: new Date().toISOString() });
  }),

  http.post('/api/auth/password-reset/confirm', async ({ request }) => {
    await simulateNetwork();
    const failure = injectedError();
    if (failure) return failure;
    const parsed = passwordResetConfirmSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Enter a new password.');
    if (parsed.data.token === 'expired') {
      return errorResponse(
        410,
        'link_expired',
        'This reset link has expired. Links work for 1 hour — request a new one.',
      );
    }
    return HttpResponse.json({ ok: true });
  }),
];
