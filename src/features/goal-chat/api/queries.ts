'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api';
import { walletKeys } from '@/features/wallet';
import { z } from 'zod';
import { coverageResultSchema } from '../model/coverage.schema';
import {
  briefListSchema,
  subjectSchema,
  researchBriefSchema,
  type BriefPatch,
  type ResearchBrief,
} from '../model/brief.schema';
import {
  checkoutResultSchema,
  conversationSchema,
  type CheckoutInput,
  type Conversation,
} from '../model/turn.schema';
import { briefKeys } from './keys';

export function useBriefs() {
  return useQuery({
    queryKey: briefKeys.list(),
    queryFn: ({ signal }) => apiRequest('/briefs', { schema: briefListSchema, signal }),
  });
}

export function useCreateBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/briefs', { method: 'POST', schema: researchBriefSchema }),
    onSuccess: (brief) => {
      queryClient.setQueryData<Conversation>(briefKeys.conversation(brief.id), {
        brief,
        messages: [],
      });
      void queryClient.invalidateQueries({ queryKey: briefKeys.list() });
    },
  });
}

export function useConversation(briefId: string) {
  return useQuery({
    queryKey: briefKeys.conversation(briefId),
    queryFn: ({ signal }) =>
      apiRequest(`/briefs/${briefId}`, { schema: conversationSchema, signal }),
    // The conversation only changes through this client; keep it while the chat is open.
    staleTime: Infinity,
  });
}

function writeBrief(queryClient: ReturnType<typeof useQueryClient>, brief: ResearchBrief) {
  queryClient.setQueryData<Conversation>(briefKeys.conversation(brief.id), (current) =>
    current ? { ...current, brief } : current,
  );
  void queryClient.invalidateQueries({ queryKey: briefKeys.list() });
}

/** Edits from the needs summary card; edits sync back to every step. */
export function useUpdateBrief(briefId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: BriefPatch) =>
      apiRequest(`/briefs/${briefId}`, {
        method: 'PATCH',
        body: patch,
        schema: researchBriefSchema,
      }),
    onSuccess: (brief) => writeBrief(queryClient, brief),
  });
}

/** Buy reports and/or request a quote (F2 step 7). */
export function useCheckout(briefId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      apiRequest(`/briefs/${briefId}/checkout`, {
        method: 'POST',
        body: input,
        schema: checkoutResultSchema,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData<Conversation>(briefKeys.conversation(briefId), (current) =>
        current
          ? { brief: result.brief, messages: [...current.messages, result.assistantMessage] }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: briefKeys.list() });
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: [...briefKeys.all, 'subjects'] as const,
    queryFn: ({ signal }) => apiRequest('/subjects', { schema: z.array(subjectSchema), signal }),
    staleTime: Infinity, // Static catalogue of companies, regions, industries.
  });
}

export function useCoverage(briefId: string) {
  return useQuery({
    queryKey: briefKeys.coverage(briefId),
    queryFn: ({ signal }) =>
      apiRequest(`/briefs/${briefId}/coverage`, { schema: coverageResultSchema, signal }),
  });
}
