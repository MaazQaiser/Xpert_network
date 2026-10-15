'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/shared/api';
import { notificationSchema, type Notification } from '../model/notification.schema';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

const listSchema = z.array(notificationSchema);

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) => apiRequest('/notifications', { schema: listSchema, signal }),
    refetchInterval: 30_000,
  });
}

/** Optimistic: the dot disappears immediately; rolled back if the request fails. */
function useOptimisticRead(
  mutationFn: () => Promise<Notification[]>,
  apply: (n: Notification) => Notification,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = queryClient.getQueryData<Notification[]>(notificationKeys.list());
      queryClient.setQueryData<Notification[]>(notificationKeys.list(), (list) => list?.map(apply));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.list(), context.previous);
    },
    onSuccess: (list) => queryClient.setQueryData(notificationKeys.list(), list),
  });
}

export function useMarkNotificationRead(id: string) {
  return useOptimisticRead(
    () => apiRequest(`/notifications/${id}/read`, { method: 'POST', schema: listSchema }),
    (n) => (n.id === id ? { ...n, read: true } : n),
  );
}

export function useMarkAllNotificationsRead() {
  return useOptimisticRead(
    () => apiRequest('/notifications/read-all', { method: 'POST', schema: listSchema }),
    (n) => ({ ...n, read: true }),
  );
}
