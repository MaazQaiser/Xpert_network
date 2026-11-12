'use client';

import {
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
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
import { scheduleSchema } from '../model/schedule.schema';
import { callDetailSchema, callRecordSchema } from '../model/calls.schema';
import { networkExpertSchema } from '../model/network.schema';
import {
  inboxRequestSchema,
  mailAccountSchema,
  linkedinConversationSchema,
  linkedinMessageSchema,
  isQueuedMessage,
  senderProfileSchema,
  threadEventSchema,
  type AddMailAccountInput,
  type SenderProfile,
  type SenderSchedule,
  type CreateSenderProfileInput,
  type LinkedinConversation,
  type SendLinkedinMessageInput,
  type InboxRequest,
} from '../model/inbox.schema';
import { linkedinProfileSchema, type LinkedinProfile } from '../model/linkedinProfile.schema';
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
  linkedinProfile: (uuid: string) => [...adminKeys.all, 'linkedin', 'profile', uuid] as const,
  senderConversations: (uuid: string) =>
    [...adminKeys.all, 'inbox', 'senders', uuid, 'conversations'] as const,
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
  calls: () => [...adminKeys.all, 'calls'] as const,
  callRecord: (id: string) => [...adminKeys.all, 'calls', id] as const,
};

export function useHomeSummary() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: ({ signal }) => apiRequest('/admin/summary', { schema: homeSummarySchema, signal }),
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

/** Home chat: the person behind a LinkedIn link (GetSales adds them as a lead if new). */
export function useLookupLinkedinProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkedinUrl: string) =>
      apiRequest('/getsales/leads/lookup', {
        method: 'POST',
        body: { linkedinUrl },
        schema: linkedinProfileSchema,
      }),
    onSuccess: (profile) =>
      queryClient.setQueryData(adminKeys.linkedinProfile(profile.uuid), profile),
  });
}

// How long to wait for GetSales to read a new profile before showing what we have.
export const PROFILE_READ_TIMEOUT_MS = 150_000;

/** A looked-up profile, checked every few seconds until GetSales has read it from LinkedIn. */
export function useLinkedinProfile(uuid: string, since: number) {
  return useQuery({
    queryKey: adminKeys.linkedinProfile(uuid),
    queryFn: ({ signal }) =>
      apiRequest(`/getsales/leads/${encodeURIComponent(uuid)}`, {
        schema: linkedinProfileSchema,
        signal,
      }),
    // Until GetSales has both read them and attached their connection status (or time's up).
    refetchInterval: (query) => {
      const data = query.state.data;
      const isDone = data ? data.enriched && data.settled : false;
      return isDone || Date.now() - since > PROFILE_READ_TIMEOUT_MS ? false : 4_000;
    },
  });
}

/** Home chat: message a looked-up person from a sender; it then shows in that sender's inbox. */
export function useMessageLinkedinLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      senderUuid,
      lead,
      text,
    }: {
      senderUuid: string;
      lead: LinkedinProfile;
      text: string;
    }) =>
      apiRequest(
        `/getsales/sender-profiles/${encodeURIComponent(senderUuid)}/leads/${encodeURIComponent(
          lead.uuid,
        )}/messages`,
        { method: 'POST', body: { text }, schema: linkedinMessageSchema },
      ),
    onSuccess: (_message, { senderUuid }) =>
      queryClient.invalidateQueries({ queryKey: adminKeys.senderConversations(senderUuid) }),
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
    onSuccess: (_result, { senderUuid, leadUuid }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.senderConversations(senderUuid) });
      // The profile now shows the request as sent.
      void queryClient.invalidateQueries({ queryKey: adminKeys.linkedinProfile(leadUuid) });
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
