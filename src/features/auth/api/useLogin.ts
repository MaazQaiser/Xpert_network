'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api';
import { sessionSchema, type LoginInput } from '../model/session.schema';
import { sessionKeys } from './keys';

/** Fake login: sets the mock session to a persona (ARCHITECTURE §6). */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest('/session', { method: 'POST', body: input, schema: sessionSchema }),
    onSuccess: (session) => {
      // Everything cached belongs to the previous user.
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.current(), session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/session', { method: 'DELETE', schema: sessionSchema }),
    onSuccess: (session) => {
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.current(), session);
    },
  });
}
