import { http, HttpResponse } from 'msw';
import type { Notification } from '@/features/notifications';
import { getControls } from '../controls';
import { db } from '../store/db';
import { currentUser, injectedError, simulateNetwork, unauthorized } from './utils';

function listFor(userId: string): Notification[] {
  if (getControls().emptyData) return [];
  return [...(db.get().notifications[userId] ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function markRead(userId: string, match: (n: Notification) => boolean) {
  db.update((draft) => {
    draft.notifications[userId] = (draft.notifications[userId] ?? []).map((n) =>
      match(n) ? { ...n, read: true } : n,
    );
  });
}

export const notificationsHandlers = [
  http.get('/api/notifications', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    return injectedError() ?? HttpResponse.json(listFor(user.id));
  }),

  http.post('/api/notifications/read-all', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    markRead(user.id, () => true);
    return HttpResponse.json(listFor(user.id));
  }),

  http.post('/api/notifications/:notificationId/read', async ({ params }) => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    const failure = injectedError();
    if (failure) return failure;
    markRead(user.id, (n) => n.id === params.notificationId);
    return HttpResponse.json(listFor(user.id));
  }),
];
