'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionKeys } from '@/features/auth';
import { apiRequest } from '@/shared/api';
import {
  notificationPreferencesSchema,
  profileSchema,
  securitySchema,
  type NotificationPreferences,
  type ProfileFormValues,
  type Security,
} from '../model/profile.schema';

export const profileKeys = {
  all: ['profile'] as const,
  profile: () => [...profileKeys.all, 'me'] as const,
  preferences: () => [...profileKeys.all, 'notification-preferences'] as const,
  security: () => [...profileKeys.all, 'security'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile(),
    queryFn: ({ signal }) => apiRequest('/profile', { schema: profileSchema, signal }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProfileFormValues) =>
      apiRequest('/profile', { method: 'PATCH', body: values, schema: profileSchema }),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile(), profile);
      // Name and title show in the header's account panel.
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: profileKeys.preferences(),
    queryFn: ({ signal }) =>
      apiRequest('/preferences/notifications', { schema: notificationPreferencesSchema, signal }),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NotificationPreferences) =>
      apiRequest('/preferences/notifications', {
        method: 'PUT',
        body: values,
        schema: notificationPreferencesSchema,
      }),
    onSuccess: (prefs) => queryClient.setQueryData(profileKeys.preferences(), prefs),
  });
}

export function useSecurity() {
  return useQuery({
    queryKey: profileKeys.security(),
    queryFn: ({ signal }) => apiRequest('/security', { schema: securitySchema, signal }),
  });
}

function useSecurityMutation<TInput>(request: (input: TInput) => Promise<Security>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (security) => queryClient.setQueryData(profileKeys.security(), security),
  });
}

export function useChangePassword() {
  return useSecurityMutation((input: { currentPassword: string; newPassword: string }) =>
    apiRequest('/security/password', { method: 'POST', body: input, schema: securitySchema }),
  );
}

export function useSetTwoFactor() {
  return useSecurityMutation((input: { twoFactorEnabled: boolean; code?: string }) =>
    apiRequest('/security', { method: 'PATCH', body: input, schema: securitySchema }),
  );
}

export function useSignOutSession() {
  return useSecurityMutation((sessionId: string) =>
    apiRequest(`/security/sessions/${sessionId}`, { method: 'DELETE', schema: securitySchema }),
  );
}

export function useSignOutOtherSessions() {
  return useSecurityMutation(() =>
    apiRequest('/security/sessions/sign-out-others', { method: 'POST', schema: securitySchema }),
  );
}
