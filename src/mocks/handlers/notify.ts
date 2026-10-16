import type { Notification } from '@/features/notifications';
import { createId } from '@/shared/lib/id';
import { db } from '../store/db';

/** Adds an unread notification for a user (shown in the bell and as a toast). */
export function notifyUser(
  userId: string,
  notification: Pick<Notification, 'event' | 'title' | 'body' | 'href'>,
): void {
  db.update((draft) => {
    draft.notifications[userId] = [
      { ...notification, id: createId('ntf'), read: false, createdAt: new Date().toISOString() },
      ...(draft.notifications[userId] ?? []),
    ];
  });
}
