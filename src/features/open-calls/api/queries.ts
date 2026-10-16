'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { notificationKeys } from '@/features/notifications';
import { apiRequest } from '@/shared/api';
import { openCallSchema, type ApplyInput } from '../model/call.schema';

export const callKeys = {
  all: ['calls'] as const,
  list: () => [...callKeys.all, 'list'] as const,
  detail: (id: string) => [...callKeys.all, 'detail', id] as const,
};

export function useCalls() {
  return useQuery({
    queryKey: callKeys.list(),
    queryFn: ({ signal }) => apiRequest('/calls', { schema: z.array(openCallSchema), signal }),
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: callKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/calls/${id}`, { schema: openCallSchema, signal }),
  });
}

/** Screening answers in; the call with its application outcome out. */
export function useApply(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyInput) =>
      apiRequest(`/calls/${id}/apply`, { method: 'POST', body: input, schema: openCallSchema }),
    onSuccess: (call) => {
      queryClient.setQueryData(callKeys.detail(id), call);
      void queryClient.invalidateQueries({ queryKey: callKeys.list() });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}
