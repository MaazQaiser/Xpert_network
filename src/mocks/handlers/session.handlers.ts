import { http, HttpResponse } from 'msw';
import { loginInputSchema } from '@/features/auth';
import { USERS } from '../fixtures/users';
import { db } from '../store/db';
import { currentUser, errorResponse, simulateNetwork } from './utils';

export const sessionHandlers = [
  http.get('/api/session', async () => {
    await simulateNetwork();
    return HttpResponse.json({ user: currentUser() });
  }),

  http.post('/api/session', async ({ request }) => {
    await simulateNetwork();
    const parsed = loginInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return errorResponse(422, 'invalid_input', 'Choose who you want to log in as.');
    const user = USERS[parsed.data.personaId];
    db.update((draft) => {
      draft.sessionUserId = user.id;
    });
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
