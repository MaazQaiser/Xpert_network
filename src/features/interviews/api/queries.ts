'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { notificationKeys } from '@/features/notifications';
import { apiRequest } from '@/shared/api';
import {
  interviewSchema,
  type Interview,
  type InterviewMode,
  type PreflightInput,
} from '../model/interview.schema';

export const interviewKeys = {
  all: ['interviews'] as const,
  list: () => [...interviewKeys.all, 'list'] as const,
  detail: (id: string) => [...interviewKeys.all, 'detail', id] as const,
  mic: () => [...interviewKeys.all, 'mic'] as const,
};

export function useInterviews() {
  return useQuery({
    queryKey: interviewKeys.list(),
    queryFn: ({ signal }) =>
      apiRequest('/interviews', { schema: z.array(interviewSchema), signal }),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/interviews/${id}`, { schema: interviewSchema, signal }),
  });
}

/** Prototype microphone check (the “Mic denied” toggle plays a refused permission). */
export function useMicCheck(enabled: boolean) {
  return useQuery({
    queryKey: interviewKeys.mic(),
    queryFn: ({ signal }) =>
      apiRequest('/interviews/mic-check', { schema: z.object({ granted: z.boolean() }), signal }),
    enabled,
    staleTime: 0,
  });
}

/** Every interview mutation answers with the interview, which replaces the cached copy. */
function useInterviewChange<TInput>(id: string, request: (input: TInput) => Promise<Interview>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (interview) => {
      queryClient.setQueryData(interviewKeys.detail(id), interview);
      void queryClient.invalidateQueries({ queryKey: interviewKeys.list() });
    },
  });
}

export function useStartInterview(id: string) {
  return useInterviewChange(id, (input: PreflightInput) =>
    apiRequest(`/interviews/${id}/start`, { method: 'POST', body: input, schema: interviewSchema }),
  );
}

export function useUpdateInterview(id: string) {
  return useInterviewChange(
    id,
    (patch: { status?: 'paused' | 'in_progress'; mode?: InterviewMode }) =>
      apiRequest(`/interviews/${id}`, { method: 'PATCH', body: patch, schema: interviewSchema }),
  );
}

export function useEndInterview(id: string) {
  return useInterviewChange(id, () =>
    apiRequest(`/interviews/${id}/end`, { method: 'POST', schema: interviewSchema }),
  );
}

/** `text: null` reverts a section summary to the AI draft. */
export function useEditSummary(id: string) {
  return useInterviewChange(id, (input: { sectionId: string; text: string | null }) =>
    apiRequest(`/interviews/${id}/summaries`, {
      method: 'PATCH',
      body: input,
      schema: interviewSchema,
    }),
  );
}

export function useSubmitInterview(id: string) {
  const queryClient = useQueryClient();
  const change = useInterviewChange(id, () =>
    apiRequest(`/interviews/${id}/submit`, { method: 'POST', schema: interviewSchema }),
  );
  return {
    ...change,
    mutate: (options?: { onSuccess?: () => void }) =>
      change.mutate(undefined, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['earnings'] });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          options?.onSuccess?.();
        },
      }),
  };
}
