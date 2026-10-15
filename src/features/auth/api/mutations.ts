'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/shared/api';
import {
  authUserResultSchema,
  oauthAccountSchema,
  oauthResultSchema,
  sentAtSchema,
  type OAuthInput,
  type OAuthProvider,
  type SignUpInput,
  type User,
} from '../model/session.schema';
import { sessionKeys } from './keys';

/** A new identity is logged in: drop the previous user's cache, seed the session. */
function useSetSessionUser() {
  const queryClient = useQueryClient();
  return (user: User) => {
    queryClient.clear();
    queryClient.setQueryData(sessionKeys.current(), { user });
  };
}

export function useSignUp() {
  const setUser = useSetSessionUser();
  return useMutation({
    mutationFn: (input: SignUpInput) =>
      apiRequest('/auth/sign-up', { method: 'POST', body: input, schema: authUserResultSchema }),
    onSuccess: ({ user }) => setUser(user),
  });
}

export function useOAuthAccounts(provider: OAuthProvider | null) {
  return useQuery({
    queryKey: [...sessionKeys.all, 'oauth-accounts', provider] as const,
    queryFn: ({ signal }) =>
      apiRequest(`/auth/oauth/${provider}/accounts`, {
        schema: z.array(oauthAccountSchema),
        signal,
      }),
    enabled: provider !== null,
  });
}

export function useOAuthSignIn() {
  const setUser = useSetSessionUser();
  return useMutation({
    mutationFn: (input: OAuthInput) =>
      apiRequest('/auth/oauth', { method: 'POST', body: input, schema: oauthResultSchema }),
    onSuccess: ({ user }) => setUser(user),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest('/auth/verify-email', { method: 'POST', schema: authUserResultSchema }),
    onSuccess: ({ user }) => queryClient.setQueryData(sessionKeys.current(), { user }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiRequest('/auth/verify-email/resend', { method: 'POST', schema: sentAtSchema }),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest('/auth/password-reset', {
        method: 'POST',
        body: { email },
        schema: sentAtSchema,
      }),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiRequest('/auth/password-reset/confirm', {
        method: 'POST',
        body: input,
        schema: z.object({ ok: z.boolean() }),
      }),
  });
}
