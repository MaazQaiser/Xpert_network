'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/shared/api';
import { assistantReplySchema, homeSummarySchema } from '../model/home.schema';
import { inboxRequestSchema } from '../model/inbox.schema';
import {
  generateShortlistInputSchema,
  matchResultSchema,
  shortlistPatchSchema,
  shortlistSchema,
  type GenerateShortlistInput,
  type MatchPatch,
  type MatchResult,
  type Shortlist,
  type ShortlistPatch,
} from '../model/match.schema';
import {
  clarificationSchema,
  projectSchema,
  projectSummarySchema,
  type Clarification,
  type Project,
  type ProjectPatch,
} from '../model/project.schema';

export const adminKeys = {
  all: ['admin'] as const,
  summary: () => [...adminKeys.all, 'summary'] as const,
  inbox: () => [...adminKeys.all, 'inbox'] as const,
  projects: () => [...adminKeys.all, 'projects'] as const,
  project: (id: string) => [...adminKeys.all, 'project', id] as const,
  clarification: (id: string) => [...adminKeys.all, 'project', id, 'clarification'] as const,
  matches: (id: string) => [...adminKeys.all, 'project', id, 'matches'] as const,
  shortlist: (id: string) => [...adminKeys.all, 'project', id, 'shortlist'] as const,
};

export function useHomeSummary() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: ({ signal }) => apiRequest('/admin/summary', { schema: homeSummarySchema, signal }),
  });
}

export function useInbox() {
  return useQuery({
    queryKey: adminKeys.inbox(),
    queryFn: ({ signal }) =>
      apiRequest('/admin/inbox', { schema: z.array(inboxRequestSchema), signal }),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: adminKeys.projects(),
    queryFn: ({ signal }) =>
      apiRequest('/admin/projects', { schema: z.array(projectSummarySchema), signal }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: adminKeys.project(id),
    queryFn: ({ signal }) => apiRequest(`/admin/projects/${id}`, { schema: projectSchema, signal }),
  });
}

export function useMatches(id: string) {
  return useQuery({
    queryKey: adminKeys.matches(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/matches`, { schema: matchResultSchema, signal }),
  });
}

export function useShortlist(id: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.shortlist(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/shortlist`, { schema: shortlistSchema, signal }),
    enabled,
    retry: false,
  });
}

/** Every project action returns the updated project; lists and the summary are refreshed. */
function useProjectAction<TInput = void>(
  id: string,
  path: string,
  method: 'POST' | 'PATCH' = 'POST',
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TInput) =>
      apiRequest(`/admin/projects/${id}${path}`, {
        method,
        body: body ?? undefined,
        schema: projectSchema,
      }),
    onSuccess: (project: Project) => {
      queryClient.setQueryData(adminKeys.project(id), project);
      void queryClient.invalidateQueries({ queryKey: adminKeys.projects() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.inbox() });
    },
  });
}

export const useUpdateProject = (id: string) => useProjectAction<ProjectPatch>(id, '', 'PATCH');
export const useResetToAi = (id: string) =>
  useProjectAction<{ part: 'brief' | 'requirements' | 'questions' }>(id, '/reset');
export const useRegenerateBrief = (id: string) =>
  useProjectAction<{ length: 'standard' | 'shorter' }>(id, '/brief/regenerate');
export const useConfirmFact = (id: string) =>
  useProjectAction<{ confirmationId: string }>(id, '/confirmations');
export const useSendClarification = (id: string) =>
  useProjectAction<Clarification>(id, '/clarification');
export const useApproveProject = (id: string) => useProjectAction(id, '/approve');

export function usePatchMatch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MatchPatch) =>
      apiRequest(`/admin/projects/${id}/matches`, {
        method: 'PATCH',
        body,
        schema: matchResultSchema,
      }),
    onSuccess: (matches: MatchResult) => {
      queryClient.setQueryData(adminKeys.matches(id), matches);
    },
  });
}

export function useGenerateShortlist(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateShortlistInput) =>
      apiRequest(`/admin/projects/${id}/shortlist`, {
        method: 'POST',
        body: generateShortlistInputSchema.parse(body),
        schema: shortlistSchema,
      }),
    onSuccess: (shortlist: Shortlist) => {
      queryClient.setQueryData(adminKeys.shortlist(id), shortlist);
      void queryClient.invalidateQueries({ queryKey: adminKeys.project(id) });
    },
  });
}

export function usePatchShortlist(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ShortlistPatch) =>
      apiRequest(`/admin/projects/${id}/shortlist`, {
        method: 'PATCH',
        body: shortlistPatchSchema.parse(body),
        schema: shortlistSchema,
      }),
    onSuccess: (shortlist: Shortlist) => {
      queryClient.setQueryData(adminKeys.shortlist(id), shortlist);
    },
  });
}

/** The AI's draft of the clarification email, built from the open confirmations. */
export function useClarificationDraft(id: string, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.clarification(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/clarification`, { schema: clarificationSchema, signal }),
    enabled,
    staleTime: 0,
  });
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: (text: string) =>
      apiRequest('/admin/assistant', {
        method: 'POST',
        body: { text },
        schema: assistantReplySchema,
      }),
  });
}
