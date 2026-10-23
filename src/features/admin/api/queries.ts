'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/shared/api';
import { assistantReplySchema, homeSummarySchema } from '../model/home.schema';
import {
  expertSearchResultSchema,
  screeningResultSchema,
  type ExpertSearchInput,
} from '../model/expertSearch.schema';
import {
  availabilityActionResultSchema,
  availabilitySchema,
  type AvailabilityAction,
} from '../model/availability.schema';
import { clientDraftSchema, type ClientDraftInput } from '../model/clientDraft.schema';
import { bookingSchema, type BookingAction } from '../model/booking.schema';
import { callSessionSchema, type CallAction } from '../model/call.schema';
import { inboxRequestSchema } from '../model/inbox.schema';
import { nudgeResultSchema, responsesSchema } from '../model/responses.schema';
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
  responses: (id: string) => [...adminKeys.all, 'project', id, 'responses'] as const,
  clientDraft: (id: string) => [...adminKeys.all, 'project', id, 'client-draft'] as const,
  booking: (id: string) => [...adminKeys.all, 'project', id, 'booking'] as const,
  call: (id: string) => [...adminKeys.all, 'project', id, 'call'] as const,
  availability: (id: string, experts: string) =>
    [...adminKeys.all, 'project', id, 'availability', experts] as const,
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

/** Screen 03 Experts tab: the next batch of matching experts (works on a draft project). */
export function useExpertSearch(id: string) {
  return useMutation({
    mutationFn: (body: ExpertSearchInput) =>
      apiRequest(`/admin/projects/${id}/expert-search`, {
        method: 'POST',
        body,
        schema: expertSearchResultSchema,
      }),
  });
}

/** Sends the client questions to one expert as screening questions (email sandbox). */
export function useSendScreening(id: string) {
  return useMutation({
    mutationFn: (expertId: string) =>
      apiRequest(`/admin/projects/${id}/screening`, {
        method: 'POST',
        body: { expertId },
        schema: screeningResultSchema,
      }),
  });
}

/** Screen 08: who answered the screening questions, with the AI's quality read and picks. */
export function useResponses(id: string) {
  return useQuery({
    queryKey: adminKeys.responses(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/responses`, { schema: responsesSchema, signal }),
  });
}

/** Reminds experts who haven't finished the screening questions (email sandbox). */
export function useNudgeExperts(id: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest(`/admin/projects/${id}/responses/nudge`, {
        method: 'POST',
        body: {},
        schema: nudgeResultSchema,
      }),
  });
}

/** Screen 09: the chosen experts' offered times. `experts` records a new selection. */
export function useAvailability(id: string, experts: string[]) {
  const query = experts.length > 0 ? `?experts=${experts.map(encodeURIComponent).join(',')}` : '';
  return useQuery({
    queryKey: adminKeys.availability(id, experts.join(',')),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/availability${query}`, {
        schema: availabilitySchema,
        signal,
      }),
  });
}

/** Screen 09 actions: nudge, resend compliance, message an expert, send to the client. */
export function useAvailabilityAction(id: string) {
  return useMutation({
    mutationFn: (body: AvailabilityAction) =>
      apiRequest(`/admin/projects/${id}/availability`, {
        method: 'POST',
        body,
        schema: availabilityActionResultSchema,
      }),
  });
}

/** Screen 10: the AI-drafted email to the client (404 until screen 09 prepares it). */
export function useClientDraft(id: string) {
  return useQuery({
    queryKey: adminKeys.clientDraft(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/client-draft`, { schema: clientDraftSchema, signal }),
  });
}

/** Saves the client email, or sends it (email sandbox). */
export function useSaveClientDraft(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientDraftInput) =>
      apiRequest(`/admin/projects/${id}/client-draft`, {
        method: 'POST',
        body,
        schema: clientDraftSchema,
      }),
    onSuccess: (draft) => {
      queryClient.setQueryData(adminKeys.clientDraft(id), draft);
      // Sending makes the client's (scripted) reply land in the inbox.
      if (draft.sentAt) {
        void queryClient.invalidateQueries({ queryKey: adminKeys.inbox() });
        void queryClient.invalidateQueries({ queryKey: adminKeys.booking(id) });
      }
    },
  });
}

/** Screens 11–13: the client's picks, the sync with the experts and the booked calls. */
export function useBooking(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminKeys.booking(id),
    enabled,
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/booking`, { schema: bookingSchema, signal }),
  });
}

export function useBookingAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BookingAction) =>
      apiRequest(`/admin/projects/${id}/booking`, { method: 'POST', body, schema: bookingSchema }),
    onSuccess: (booking) => {
      queryClient.setQueryData(adminKeys.booking(id), booking);
      void queryClient.invalidateQueries({ queryKey: adminKeys.inbox() });
    },
  });
}

/** Screen 14: the live call workspace. */
export function useCallSession(id: string) {
  return useQuery({
    queryKey: adminKeys.call(id),
    queryFn: ({ signal }) =>
      apiRequest(`/admin/projects/${id}/call`, { schema: callSessionSchema, signal }),
  });
}

export function useCallAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CallAction) =>
      apiRequest(`/admin/projects/${id}/call`, { method: 'POST', body, schema: callSessionSchema }),
    onSuccess: (session) => queryClient.setQueryData(adminKeys.call(id), session),
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
