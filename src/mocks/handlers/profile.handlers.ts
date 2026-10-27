import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { User } from '@/features/auth';
import {
  notificationPreferencesSchema,
  profileFormSchema,
  type Profile,
  type Security,
} from '@/features/profile';
import { getControls } from '../controls';
import { DEFAULT_PROFILE_EXTRAS, defaultPreferences, defaultSecurity } from '../fixtures/profile';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

async function guard() {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return { response: unauthorized() } as const;
  const failure = injectedError();
  if (failure) return { response: failure } as const;
  return { user } as const;
}

function profileOf(user: User): Profile {
  const extras = db.get().profiles[user.id] ?? DEFAULT_PROFILE_EXTRAS;
  return {
    name: user.name,
    title: user.title,
    organisation: user.organisation,
    email: user.email,
    ...extras,
  };
}

/** "Empty data" leaves only this device in the sessions list. */
function securityOf(user: User): Security {
  const security = db.get().security[user.id] ?? defaultSecurity();
  return getControls().emptyData
    ? { ...security, sessions: security.sessions.filter((s) => s.isCurrent) }
    : security;
}

function updateSecurity(user: User, mutate: (security: Security) => Security) {
  db.update((draft) => {
    draft.security[user.id] = mutate(draft.security[user.id] ?? defaultSecurity());
  });
  return securityOf(user);
}

export const profileHandlers = [
  http.get('/api/profile', async () => {
    const result = await guard();
    if ('response' in result) return result.response;
    return HttpResponse.json(profileOf(result.user));
  }),

  http.patch('/api/profile', async ({ request }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const { user } = result;
    const parsed = profileFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        422,
        'invalid_input',
        parsed.error.issues[0]?.message ?? 'Check the highlighted fields.',
      );
    }
    const { name, title, organisation, phone, timezone } = parsed.data;
    db.update((draft) => {
      const stored = draft.users[user.id];
      if (stored) Object.assign(stored, { name, title, organisation });
      draft.profiles[user.id] = { phone, timezone };
    });
    const updated = db.get().users[user.id] ?? user;
    return HttpResponse.json(profileOf(updated));
  }),

  http.get('/api/preferences/notifications', async () => {
    const result = await guard();
    if ('response' in result) return result.response;
    const { user } = result;
    return HttpResponse.json(db.get().preferences[user.id] ?? defaultPreferences(user.role));
  }),

  http.put('/api/preferences/notifications', async ({ request }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const parsed = notificationPreferencesSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Those preferences couldn’t be saved.');
    db.update((draft) => {
      draft.preferences[result.user.id] = parsed.data;
    });
    return HttpResponse.json(parsed.data);
  }),

  http.get('/api/security', async () => {
    const result = await guard();
    if ('response' in result) return result.response;
    return HttpResponse.json(securityOf(result.user));
  }),

  /** Any current password is accepted, except "wrong-password" (to demo the error). */
  http.post('/api/security/password', async ({ request }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const parsed = z
      .object({ currentPassword: z.string(), newPassword: z.string() })
      .safeParse(await request.json());
    if (!parsed.success) return errorResponse(422, 'invalid_input', 'Enter both passwords.');
    if (parsed.data.currentPassword === 'wrong-password') {
      return errorResponse(
        422,
        'wrong_password',
        'Your current password isn’t right. Try again, or reset it from the log-in page.',
      );
    }
    return HttpResponse.json(
      updateSecurity(result.user, (s) => ({ ...s, passwordChangedAt: new Date().toISOString() })),
    );
  }),

  http.patch('/api/security', async ({ request }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    const parsed = z
      .object({ twoFactorEnabled: z.boolean(), code: z.string().optional() })
      .safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Check the code and try again.');
    if (parsed.data.twoFactorEnabled && parsed.data.code === '000000') {
      return errorResponse(
        422,
        'invalid_code',
        'That code didn’t work. Codes change every 30 seconds. Enter the newest one.',
      );
    }
    return HttpResponse.json(
      updateSecurity(result.user, (s) => ({
        ...s,
        twoFactorEnabled: parsed.data.twoFactorEnabled,
      })),
    );
  }),

  http.delete('/api/security/sessions/:sessionId', async ({ params }) => {
    const result = await guard();
    if ('response' in result) return result.response;
    return HttpResponse.json(
      updateSecurity(result.user, (s) => ({
        ...s,
        sessions: s.sessions.filter(
          (session) => session.isCurrent || session.id !== params.sessionId,
        ),
      })),
    );
  }),

  http.post('/api/security/sessions/sign-out-others', async () => {
    const result = await guard();
    if ('response' in result) return result.response;
    return HttpResponse.json(
      updateSecurity(result.user, (s) => ({
        ...s,
        sessions: s.sessions.filter((session) => session.isCurrent),
      })),
    );
  }),
];
