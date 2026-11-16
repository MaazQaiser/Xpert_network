'use client';

import {
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { z } from 'zod';
import { apiRequest, isApiError, streamEvents } from '@/shared/api';
import {
  briefRequirementsSchema,
  type BriefRequirements,
  type RequirementsEdits,
} from '../model/requirements.schema';
import {
  searchEventSchema,
  searchSchema,
  searchSummarySchema,
  type Search,
  type SearchPerson,
} from '../model/search.schema';
import {
  homeSummarySchema,
  mailboxSummarySchema,
  scioConversationDetailSchema,
  scioConversationSchema,
  type ScioConversation,
} from '../model/home.schema';
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
import { scheduleSchema } from '../model/schedule.schema';
import { callDetailSchema, callRecordSchema } from '../model/calls.schema';
import { networkExpertSchema } from '../model/network.schema';
import {
  leadListSchema,
  listFollowUpSchema,
  type ListFollowUpInput,
} from '../model/leadList.schema';
import {
  inboxRequestSchema,
  mailAccountSchema,
  linkedinConversationSchema,
  linkedinMessageSchema,
  isQueuedMessage,
  senderProfileSchema,
  threadEventSchema,
  cloudBrowserSchema,
  linkedinSessionSchema,
  proxyCountrySchema,
  type AddMailAccountInput,
  type SenderProfile,
  type SenderSchedule,
  type CreateSenderProfileInput,
  type LinkedinConversation,
  type SendLinkedinMessageInput,
  type InboxRequest,
} from '../model/inbox.schema';
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
  mailAccounts: () => [...adminKeys.all, 'inbox', 'accounts'] as const,
  senderProfiles: () => [...adminKeys.all, 'inbox', 'senders'] as const,
  proxyCountries: () => [...adminKeys.all, 'inbox', 'proxy-countries'] as const,
  linkedinSession: (senderUuid: string) =>
    [...adminKeys.all, 'inbox', 'linkedin-session', senderUuid] as const,
  senderConversations: (uuid: string) =>
    [...adminKeys.all, 'inbox', 'senders', uuid, 'conversations'] as const,
  leadList: (uuid: string) => [...adminKeys.all, 'leadList', uuid] as const,
  listFollowUp: (uuid: string) => [...adminKeys.all, 'leadList', uuid, 'followUp'] as const,
  threadActivity: (senderUuid: string, leadUuid: string) =>
    [...adminKeys.all, 'inbox', 'senders', senderUuid, 'activity', leadUuid] as const,
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
  schedule: () => [...adminKeys.all, 'schedule'] as const,
  scioChats: () => [...adminKeys.all, 'scio', 'chats'] as const,
  scioChat: (id: string) => [...adminKeys.all, 'scio', 'chat', id] as const,
  requirements: (briefId: string) => [...adminKeys.all, 'requirements', briefId] as const,
  search: (id: string) => [...adminKeys.all, 'search', id] as const,
  briefSearches: (briefId: string) => [...adminKeys.all, 'searches', briefId] as const,
  calls: () => [...adminKeys.all, 'calls'] as const,
  callRecord: (id: string) => [...adminKeys.all, 'calls', id] as const,
};

export function useHomeSummary() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: async ({ signal }) => {
      // New project emails are the briefs in the mailbox Scio reads, so the count matches what
      // Scio lists. If it can't be reached, the prototype's own count stands.
      const [summary, mailbox] = await Promise.all([
        apiRequest('/admin/summary', { schema: homeSummarySchema, signal }),
        apiRequest('/mailbox/summary', { schema: mailboxSummarySchema, signal }).catch(() => null),
      ]);
      return mailbox ? { ...summary, newProjectEmails: mailbox.newToday } : summary;
    },
  });
}

/** Marks an email read (on open) or unread (from the toolbar); the list updates straight away. */
export function useMarkInboxRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      apiRequest(`/admin/inbox/${id}/read`, {
        method: 'POST',
        body: { read },
        schema: inboxRequestSchema,
      }),
    onMutate: ({ id, read }) =>
      queryClient.setQueryData<InboxRequest[]>(adminKeys.inbox(), (list) =>
        list?.map((r) => (r.id === id ? { ...r, read } : r)),
      ),
  });
}

/** Screen 02: the mailboxes the AI watches. */
export function useMailAccounts() {
  return useQuery({
    queryKey: adminKeys.mailAccounts(),
    queryFn: ({ signal }) =>
      apiRequest('/admin/inbox/accounts', { schema: z.array(mailAccountSchema), signal }),
  });
}

export function useAddMailAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMailAccountInput) =>
      apiRequest('/admin/inbox/accounts', { method: 'POST', body, schema: mailAccountSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.mailAccounts() }),
  });
}

/**
 * Screen 02: the LinkedIn sender profiles in GetSales. Unlike the rest of the console, these
 * come from the real PoC backend (next.config.ts rewrites /api/getsales to it; MSW passes the
 * call through in the browser).
 */
export function useSenderProfiles() {
  return useQuery({
    queryKey: adminKeys.senderProfiles(),
    queryFn: ({ signal }) =>
      apiRequest('/getsales/sender-profiles', { schema: z.array(senderProfileSchema), signal }),
    // Picks up a LinkedIn sign-out, stop or pause within a minute.
    refetchInterval: 60_000,
  });
}

/**
 * Every LinkedIn conversation of one sender profile. Checked each minute for replies, and every
 * 10 seconds while a message we sent is still queued in GetSales (waiting or going out).
 */
function senderConversationsOptions(uuid: string) {
  return queryOptions({
    queryKey: adminKeys.senderConversations(uuid),
    queryFn: ({ signal }) =>
      apiRequest(`/getsales/sender-profiles/${encodeURIComponent(uuid)}/conversations`, {
        schema: z.array(linkedinConversationSchema),
        signal,
      }),
    refetchInterval: (query) =>
      query.state.data?.some((c) => c.messages.some(isQueuedMessage)) ? 10_000 : 60_000,
  });
}

/**
 * What happened in a thread besides messages (our connection note accepted, a message opened),
 * refreshed with the conversations.
 */
/** A GetSales lead list and its people: the experts of the project built on it. */
export function useLeadList(uuid: string) {
  return useQuery({
    queryKey: adminKeys.leadList(uuid),
    queryFn: ({ signal }) =>
      apiRequest(`/getsales/lists/${encodeURIComponent(uuid)}`, { schema: leadListSchema, signal }),
  });
}

/** Whether interested replies on this list get the screening questions automatically. */
export function useListFollowUp(listUuid: string) {
  return useQuery({
    queryKey: adminKeys.listFollowUp(listUuid),
    queryFn: ({ signal }) =>
      apiRequest(`/getsales/lists/${encodeURIComponent(listUuid)}/follow-up`, {
        schema: listFollowUpSchema,
        signal,
      }),
  });
}

export function useSaveListFollowUp(listUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ListFollowUpInput) =>
      apiRequest(`/getsales/lists/${encodeURIComponent(listUuid)}/follow-up`, {
        method: 'PUT',
        body: input,
        schema: listFollowUpSchema,
      }),
    onSuccess: (saved) => queryClient.setQueryData(adminKeys.listFollowUp(listUuid), saved),
  });
}

export function useThreadActivity(senderUuid: string, leadUuid: string) {
  return useQuery({
    queryKey: adminKeys.threadActivity(senderUuid, leadUuid),
    queryFn: ({ signal }) =>
      apiRequest(
        `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/leads/${encodeURIComponent(
          leadUuid,
        )}/activity`,
        { schema: z.array(threadEventSchema), signal },
      ),
    refetchInterval: 60_000,
  });
}

export function useSenderConversations(uuid: string, { enabled = true } = {}) {
  return useQuery({ ...senderConversationsOptions(uuid), enabled: enabled && Boolean(uuid) });
}

/**
 * Conversations with an unread reply, per sender, for the account switcher. Shares the cache
 * (and the minute-by-minute refresh) with the open sender's conversation list.
 */
export function useSendersUnread(uuids: string[]): Record<string, number> {
  return useQueries({
    queries: uuids.map((uuid) => senderConversationsOptions(uuid)),
    combine: (results) =>
      Object.fromEntries(
        uuids.map((uuid, i) => [uuid, results[i]?.data?.filter((c) => c.unread > 0).length ?? 0]),
      ),
  });
}

/**
 * Reply in a LinkedIn conversation through GetSales; the message shows as queued straight away.
 * A retry passes `replaces` (the failed message's uuid), so the failed copy leaves the thread.
 */
export function useSendLinkedinMessage(senderUuid: string, conversation: LinkedinConversation) {
  const queryClient = useQueryClient();
  const key = adminKeys.senderConversations(senderUuid);
  return useMutation({
    mutationFn: ({ text }: SendLinkedinMessageInput & { replaces?: string }) =>
      apiRequest(
        `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/leads/${encodeURIComponent(
          conversation.lead.uuid,
        )}/messages`,
        { method: 'POST', body: { text }, schema: linkedinMessageSchema },
      ),
    onSuccess: (message, { replaces }) => {
      queryClient.setQueryData<LinkedinConversation[]>(key, (list) =>
        list?.map((c) =>
          c.id === conversation.id
            ? {
                ...c,
                lastMessageAt: message.sentAt ?? c.lastMessageAt,
                messages: [...c.messages.filter((m) => m.uuid !== replaces), message],
              }
            : c,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Opening a thread marks the lead's messages read (kept by the PoC backend). */
export function useMarkConversationRead(senderUuid: string) {
  const queryClient = useQueryClient();
  const key = adminKeys.senderConversations(senderUuid);
  return useMutation({
    mutationFn: ({ leadUuid, until }: { leadUuid: string; until: string }) =>
      apiRequest(
        `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/leads/${encodeURIComponent(
          leadUuid,
        )}/read`,
        { method: 'POST', body: { until }, schema: z.null() },
      ),
    // Clear the dot straight away; the server keeps it cleared on the next sync.
    onMutate: ({ leadUuid, until }) => {
      queryClient.setQueryData<LinkedinConversation[]>(key, (list) =>
        list?.map((c) =>
          c.lead.uuid === leadUuid
            ? {
                ...c,
                unread: 0,
                messages: c.messages.map((m) =>
                  m.direction === 'received' && (m.sentAt ?? '') <= until
                    ? { ...m, read: true }
                    : m,
                ),
              }
            : c,
        ),
      );
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Invite someone who isn't a 1st-degree connection, with a note (LinkedIn allows 300
 * characters). GetSales can't message them until they accept.
 */
export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      senderUuid,
      leadUuid,
      note,
    }: {
      senderUuid: string;
      leadUuid: string;
      note: string;
      /** The refused message this replaces, when it comes from one. */
      messageUuid?: string;
    }) =>
      apiRequest(
        `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/leads/${encodeURIComponent(
          leadUuid,
        )}/connect`,
        {
          method: 'POST',
          body: { note },
          schema: z.object({ flowUuid: z.string(), status: z.literal('queued') }),
        },
      ),
    onSuccess: (_result, { senderUuid }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.senderConversations(senderUuid) });
    },
  });
}

export function useCreateSenderProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ label, ...rest }: CreateSenderProfileInput) =>
      apiRequest('/getsales/sender-profiles', {
        method: 'POST',
        body: { ...rest, label: label || null },
        schema: senderProfileSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.senderProfiles() }),
  });
}

/** Set when a sender's messages and connection requests may go out (saved in GetSales). */
export function useUpdateSenderSchedule(senderUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schedule: SenderSchedule) =>
      apiRequest(`/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/schedule`, {
        method: 'PUT',
        body: schedule,
        schema: senderProfileSchema,
      }),
    onSuccess: (updated) =>
      queryClient.setQueryData<SenderProfile[]>(adminKeys.senderProfiles(), (list) =>
        list?.map((p) => (p.uuid === updated.uuid ? updated : p)),
      ),
  });
}

const linkedinPath = (senderUuid: string) =>
  `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/linkedin`;

/** Countries a sender's cloud browser can get a proxy in. They rarely change. */
export function useProxyCountries() {
  return useQuery({
    queryKey: adminKeys.proxyCountries(),
    queryFn: ({ signal }) =>
      apiRequest('/getsales/proxy-countries', { schema: z.array(proxyCountrySchema), signal }),
    staleTime: Infinity,
  });
}

/** Step 1 of connecting LinkedIn: a cloud browser behind a proxy in that country. */
export function useSetSenderProxy(senderUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (countryCode: string) =>
      apiRequest(`${linkedinPath(senderUuid)}/proxy`, {
        method: 'PUT',
        body: { countryCode },
        schema: senderProfileSchema,
      }),
    onSuccess: (updated) =>
      queryClient.setQueryData<SenderProfile[]>(adminKeys.senderProfiles(), (list) =>
        list?.map((p) => (p.uuid === updated.uuid ? updated : p)),
      ),
  });
}

/** Step 2: a link to the sender's cloud browser, to sign in to LinkedIn there. */
export function useOpenCloudBrowser(senderUuid: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest(`${linkedinPath(senderUuid)}/sign-in`, {
        method: 'POST',
        schema: cloudBrowserSchema,
      }),
  });
}

/** Polls the session while someone signs in and it's checked; stops once it's connected. */
export function useLinkedinSession(senderUuid: string, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.linkedinSession(senderUuid),
    queryFn: ({ signal }) =>
      apiRequest(`${linkedinPath(senderUuid)}/session`, { schema: linkedinSessionSchema, signal }),
    enabled,
    refetchInterval: (query) => (query.state.data?.state === 'connected' ? false : 3000),
  });
}

/** Sign a sender out of LinkedIn; it then shows as not connected. */
export function useDisconnectLinkedin(senderUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/linkedin`, {
        method: 'DELETE',
        schema: senderProfileSchema,
      }),
    onSuccess: (updated) =>
      queryClient.setQueryData<SenderProfile[]>(adminKeys.senderProfiles(), (list) =>
        list?.map((p) => (p.uuid === updated.uuid ? updated : p)),
      ),
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

export function useProject(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminKeys.project(id),
    enabled,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expertId: string) =>
      apiRequest(`/admin/projects/${id}/screening`, {
        method: 'POST',
        body: { expertId },
        schema: screeningResultSchema,
      }),
    // The project file's "View screening answers" counts who was sent the questions.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.responses(id) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.project(id) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.projects() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

/** Screen 08: who answered the screening questions, with the AI's quality read and picks. */
export function useResponses(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminKeys.responses(id),
    enabled,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AvailabilityAction) =>
      apiRequest(`/admin/projects/${id}/availability`, {
        method: 'POST',
        body,
        schema: availabilityActionResultSchema,
      }),
    onSuccess: (_result, body) => {
      if (body.action === 'prepare_client') {
        return queryClient.invalidateQueries({ queryKey: adminKeys.clientDraft(id) });
      }
      return undefined;
    },
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
        void queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
        void queryClient.invalidateQueries({ queryKey: adminKeys.projects() });
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
      void queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.schedule() });
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

/** Scio's saved chats, most recent first: listed under Home in the side nav. */
export function useScioConversations() {
  return useQuery({
    queryKey: adminKeys.scioChats(),
    queryFn: ({ signal }) =>
      apiRequest('/scio/conversations', { schema: z.array(scioConversationSchema), signal }),
  });
}

const requirementsPath = (briefId: string) => `/requirements/${encodeURIComponent(briefId)}`;

/** A brief's extracted requirements, for the side panel; nothing when no brief is open (null). */
export function useBriefRequirements(briefId: string | null) {
  return useQuery({
    queryKey: adminKeys.requirements(briefId ?? 'none'),
    queryFn: ({ signal }) =>
      apiRequest(requirementsPath(briefId ?? ''), { schema: briefRequirementsSchema, signal }),
    enabled: briefId !== null,
    // The search plan is remade in the background after each save: check back until it's in.
    refetchInterval: (query) => (query.state.data?.planStatus === 'updating' ? 2_000 : false),
  });
}

/** Changes to a brief's requirements: each returns the requirements as they now stand. */
function useRequirementsChange<TInput>(
  briefId: string,
  request: (input: TInput) => Promise<BriefRequirements>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (saved) => queryClient.setQueryData(adminKeys.requirements(briefId), saved),
  });
}

/** Save the PM's edits (editing accepted requirements makes them a draft again). */
export function useSaveRequirements(briefId: string) {
  return useRequirementsChange(briefId, (edits: RequirementsEdits) =>
    apiRequest(requirementsPath(briefId), {
      method: 'PUT',
      body: edits,
      schema: briefRequirementsSchema,
    }),
  );
}

export function useAcceptRequirements(briefId: string) {
  return useRequirementsChange(briefId, () =>
    apiRequest(`${requirementsPath(briefId)}/accept`, {
      method: 'POST',
      schema: briefRequirementsSchema,
    }),
  );
}

/** Discard the PM's edits: back to the AI's draft. */
export function useRevertRequirements(briefId: string) {
  return useRequirementsChange(briefId, () =>
    apiRequest(`${requirementsPath(briefId)}/revert`, {
      method: 'POST',
      schema: briefRequirementsSchema,
    }),
  );
}

/* ----------------------------- People searches ----------------------------- */

const searchPath = (id: string) => `/searches/${encodeURIComponent(id)}`;

/** A brief's people searches, newest first. */
export function useBriefSearches(briefId: string) {
  return useQuery({
    queryKey: adminKeys.briefSearches(briefId),
    queryFn: ({ signal }) =>
      apiRequest(`/searches?briefId=${encodeURIComponent(briefId)}`, {
        schema: z.array(searchSummarySchema),
        signal,
      }),
  });
}

/** One search with its people; `useSearchStream` keeps it live. Nothing for null. */
export function useSearch(id: string | null) {
  return useQuery({
    queryKey: adminKeys.search(id ?? 'none'),
    queryFn: ({ signal }) => apiRequest(searchPath(id ?? ''), { schema: searchSchema, signal }),
    enabled: id !== null,
  });
}

/** Start a search for a brief's accepted requirements. Nothing is searched or spent before. */
export function useStartSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { briefId: string; conversationId: string | null }) =>
      apiRequest('/searches', {
        method: 'POST',
        body: input,
        schema: z.object({ id: z.string() }),
      }),
    onSuccess: (_started, { briefId }) =>
      void queryClient.invalidateQueries({ queryKey: adminKeys.briefSearches(briefId) }),
  });
}

/** Ask a search to stop; the stream says when it has (a web search already going finishes). */
export function useStopSearch(id: string) {
  return useMutation({
    mutationFn: () => apiRequest(`${searchPath(id)}/stop`, { method: 'POST', schema: z.unknown() }),
  });
}

const withPerson = (people: SearchPerson[], person: SearchPerson) =>
  people.some((p) => p.id === person.id)
    ? people.map((p) => (p.id === person.id ? person : p))
    : [...people, person];

const isPermanentRefusal = (error: unknown) =>
  isApiError(error) &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 408 &&
  error.status !== 429;

/**
 * One connection to a search's stream, read into the `useSearch` cache. Says whether it reached
 * done, whether it got anything at all (a snapshot means the server was reached), and whether
 * the server refused it outright (a 4xx: not found, not signed in, not allowed).
 */
async function readSearchStream(
  queryClient: QueryClient,
  id: string,
  signal: AbortSignal,
): Promise<{ done: boolean; heard: boolean; refused?: boolean }> {
  const key = adminKeys.search(id);
  let heard = false;
  try {
    for await (const event of streamEvents(
      `${searchPath(id)}/stream`,
      undefined,
      searchEventSchema,
      signal,
      'GET',
    )) {
      heard = true;
      // A GET still in flight would land older data over the stream's.
      await queryClient.cancelQueries({ queryKey: key });
      if (event.type === 'snapshot' || event.type === 'done') {
        queryClient.setQueryData<Search>(key, event.search);
      } else if (event.type === 'person') {
        queryClient.setQueryData<Search>(key, (search) =>
          search ? { ...search, people: withPerson(search.people, event.person) } : search,
        );
      } else {
        queryClient.setQueryData<Search>(key, (search) =>
          search
            ? {
                ...search,
                progress: event.progress,
                cost: event.cost,
                status: event.status,
                note: event.note,
                analysed: event.progress.analysed ?? search.analysed,
              }
            : search,
        );
      }
      if (event.type === 'done') {
        void queryClient.invalidateQueries({
          queryKey: adminKeys.briefSearches(event.search.briefId),
        });
        return { done: true, heard };
      }
    }
  } catch (error) {
    // A 4xx won't change by asking again (but a timeout or "too many requests" may). Dropped or
    // garbled: the caller decides.
    if (isPermanentRefusal(error)) {
      return { done: false, heard, refused: true };
    }
  }
  return { done: false, heard };
}

/** Waits between reconnects: 1 s, then 2, 4, 8, and at most 10 s. */
const SEARCH_RECONNECT_MS = { first: 1_000, max: 10_000 };

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/**
 * Follows a search's stream until it's done or nobody follows it. A stream that drops before done
 * is opened again (the server starts each one with a fresh snapshot) for as long as the search is
 * still running, backing off between tries and starting over once a connection gets through. A
 * stream the server refuses (4xx) isn't tried again: the search is fetched afresh instead, so the
 * view shows what the server says about it.
 */
async function followSearch(queryClient: QueryClient, id: string, signal: AbortSignal) {
  let wait = SEARCH_RECONNECT_MS.first;
  while (!signal.aborted) {
    const { done, heard, refused } = await readSearchStream(queryClient, id, signal);
    if (done || signal.aborted) return;
    if (refused) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.search(id) });
      return;
    }
    const status = queryClient.getQueryData<Search>(adminKeys.search(id))?.status;
    if (status !== undefined && status !== 'running') return;
    if (heard) wait = SEARCH_RECONNECT_MS.first;
    await pause(wait, signal);
    wait = Math.min(wait * 2, SEARCH_RECONNECT_MS.max);
  }
}

/** One stream per search however many views follow it (the chat card and the results table). */
const following = new WeakMap<
  QueryClient,
  Map<string, { users: number; controller: AbortController }>
>();

/**
 * Keeps a search live: reads `/api/searches/{id}/stream` and writes each event into the
 * `useSearch(id)` cache. It stops on done, or when the last view following it unmounts.
 */
export function useSearchStream(id: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (id === null) return;
    let streams = following.get(queryClient);
    if (!streams) {
      streams = new Map();
      following.set(queryClient, streams);
    }
    const live = streams;
    let entry = live.get(id);
    if (!entry) {
      const started = { users: 0, controller: new AbortController() };
      entry = started;
      live.set(id, started);
      void followSearch(queryClient, id, started.controller.signal).finally(() => {
        if (live.get(id) === started) live.delete(id);
      });
    }
    const mine = entry;
    mine.users += 1;
    return () => {
      mine.users -= 1;
      if (mine.users === 0) {
        mine.controller.abort();
        if (live.get(id) === mine) live.delete(id);
      }
    };
  }, [id, queryClient]);
}

/** Give a Scio chat a name of your own. */
export function useRenameScioChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRequest(`/scio/conversations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { title },
        schema: scioConversationSchema,
      }),
    onSuccess: (renamed) =>
      queryClient.setQueryData<ScioConversation[]>(adminKeys.scioChats(), (list) =>
        list?.map((c) => (c.id === renamed.id ? { ...c, title: renamed.title } : c)),
      ),
  });
}

/** Delete a Scio chat with its messages and Scio's memory of it. */
export function useDeleteScioChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/scio/conversations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        schema: z.null(),
      }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ScioConversation[]>(adminKeys.scioChats(), (list) =>
        list?.filter((c) => c.id !== id),
      );
      queryClient.removeQueries({ queryKey: adminKeys.scioChat(id) });
    },
  });
}

/** One saved Scio chat, to show it again; nothing for a new chat (null). */
export function useScioConversation(id: string | null) {
  return useQuery({
    queryKey: adminKeys.scioChat(id ?? 'new'),
    queryFn: ({ signal }) =>
      apiRequest(`/scio/conversations/${encodeURIComponent(id ?? '')}`, {
        schema: scioConversationDetailSchema,
        signal,
      }),
    enabled: id !== null,
    // A chat's history only changes by being used here, which adds to it locally.
    staleTime: Infinity,
  });
}

/** Scheduling: every booked call and held slot on the PM's calendar. */
export function useSchedule() {
  return useQuery({
    queryKey: adminKeys.schedule(),
    queryFn: ({ signal }) => apiRequest('/admin/schedule', { schema: scheduleSchema, signal }),
  });
}

/** Calls: every booked call, upcoming, live and completed. */
export function useCalls() {
  return useQuery({
    queryKey: adminKeys.calls(),
    queryFn: ({ signal }) =>
      apiRequest('/admin/calls', { schema: z.array(callRecordSchema), signal }),
    // A live call's progress (questions covered so far) keeps moving.
    refetchInterval: (query) =>
      query.state.data?.some((call) => call.status === 'live') ? 10_000 : false,
  });
}

/** One call's full record: summary, transcript, follow-ups. */
export function useCallRecord(id: string) {
  return useQuery({
    queryKey: adminKeys.callRecord(id),
    queryFn: ({ signal }) => apiRequest(`/admin/calls/${id}`, { schema: callDetailSchema, signal }),
    // While the call is live, keep pulling: new transcript lines, questions covered, requests.
    refetchInterval: (query) => (query.state.data?.status === 'live' ? 3000 : false),
  });
}

/** Sends a call's follow-up email to the client (email sandbox). */
export function useSendCallFollowUps(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/admin/calls/${id}/follow-ups`, { method: 'POST', schema: callDetailSchema }),
    onSuccess: (call) => {
      queryClient.setQueryData(adminKeys.callRecord(id), call);
      void queryClient.invalidateQueries({ queryKey: adminKeys.calls() });
      void queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'reports'] });
    },
  });
}

/** The Xpert Network database: every vetted expert (F20). */
export function useNetworkExperts() {
  return useQuery({
    queryKey: [...adminKeys.all, 'network'] as const,
    queryFn: ({ signal }) =>
      apiRequest('/admin/experts', { schema: z.array(networkExpertSchema), signal }),
  });
}

/** One expert in the network, with their projects and calls. */
export function useNetworkExpert(id: string) {
  return useQuery({
    queryKey: [...adminKeys.all, 'network', id] as const,
    queryFn: ({ signal }) =>
      apiRequest(`/admin/experts/${id}`, { schema: networkExpertSchema, signal }),
  });
}

/** The knowledge base: the report from every completed call, newest first. */
export function useReports() {
  return useQuery({
    queryKey: [...adminKeys.all, 'reports'] as const,
    queryFn: ({ signal }) =>
      apiRequest('/admin/reports', { schema: z.array(callDetailSchema), signal }),
  });
}
