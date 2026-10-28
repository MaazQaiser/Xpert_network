import { http, HttpResponse } from 'msw';
import {
  availabilitySubmitSchema,
  clientPickSchema,
  formSubmitSchema,
  linkDraftSchema,
  onboardSubmitSchema,
  type Invitation,
  type LinkEnvelope,
  type LinkView,
  type MailMessage,
  type Project,
  type SecureLink,
  type UpcomingCall,
} from '@/features/admin';
import { createId } from '@/shared/lib/id';
import { PROJECTS_INBOX } from '../fixtures/admin/seed';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const ONBOARD_STEPS = [
  { id: 'identity', label: 'Identity checked' },
  { id: 'terms', label: 'Confidentiality terms signed' },
  { id: 'rate', label: 'Hourly rate agreed' },
  { id: 'payment', label: 'Payment details added' },
];

function shortName(name: string) {
  const dash = name.indexOf('—');
  return dash > 0 ? name.slice(0, dash).trim() : name;
}

const notValid = () =>
  errorResponse(
    404,
    'not_found',
    'This link isn’t valid. Ask your Xpert Network contact for a new one.',
  );

/** Looks up a link; "expired…" tokens always read as expired so the state is easy to demo. */
function resolve(token: string): { link: SecureLink; project: Project } | 'expired' | null {
  if (token.startsWith('expired')) return 'expired';
  const link = db.get().adminLinks[token];
  const project = link ? db.get().adminProjects[link.projectId] : undefined;
  if (!link || !project) return null;
  if (new Date(link.expiresAt).getTime() < Date.now()) return 'expired';
  return { link, project };
}

function buildView(link: SecureLink, project: Project): LinkView | null {
  const state = db.get();
  const base = {
    token: link.token,
    projectLabel: shortName(project.name),
    expiresAt: link.expiresAt,
  };
  if (link.purpose === 'form') {
    const response = state.adminResponses[project.id]?.responses.find(
      (r) => r.linkToken === link.token,
    );
    const pitch = state.adminPitches[project.id];
    if (!response || !pitch) return null;
    return {
      purpose: 'form',
      ...base,
      status: response.status === 'submitted' ? 'submitted' : 'open',
      role: response.role,
      pay: '$450 / hour',
      minutes: 60,
      clientName: pitch.hideClientName ? null : project.client.name,
      questions: pitch.questions,
      answers: response.answers,
    };
  }
  if (link.purpose === 'availability') {
    const row = state.adminAvailability[project.id]?.experts.find(
      (e) => e.expertId === link.recordId,
    );
    const availability = state.adminAvailability[project.id];
    if (!row || !availability) return null;
    return {
      purpose: 'availability',
      ...base,
      status: link.usedAt ? 'submitted' : 'open',
      role: row.role,
      holdHours: availability.holdHours,
      timezone: availability.timezone,
      slots: row.slots,
      selectedSlotIds: link.usedAt ? row.slots.map((s) => s.id) : [],
    };
  }
  if (link.purpose === 'pick') {
    const send = state.adminClientSends[project.id];
    if (!send) return null;
    return {
      purpose: 'pick',
      ...base,
      status: send.picks ? 'submitted' : 'open',
      clientName: project.client.name,
      contactName: project.contact.name,
      subject: send.subject,
      pickLimit: send.pickLimit,
      showRates: send.showRates,
      replyBy: send.replyBy,
      experts: send.experts.map((e) => ({ ...e, rate: send.showRates ? e.rate : null })),
    };
  }
  const applicant = state.adminOutreach[project.id]?.applicants.find((a) => a.id === link.recordId);
  if (!applicant) return null;
  return {
    purpose: 'onboard',
    ...base,
    status: state.adminOutreach[project.id]?.onboardedIds.includes(applicant.id)
      ? 'submitted'
      : 'open',
    applicantName: applicant.name,
    rate: 480,
    steps: ONBOARD_STEPS,
  };
}

async function linkGuard() {
  await simulateNetwork();
  return injectedError();
}

function inbound(
  project: Project,
  subject: string,
  body: string,
  kind: MailMessage['kind'],
): MailMessage {
  return {
    id: createId('mail'),
    projectId: project.id,
    direction: 'in',
    from: project.contact.email,
    to: PROJECTS_INBOX,
    subject,
    body,
    sentAt: new Date().toISOString(),
    linkToken: null,
    kind,
  };
}

export const linksHandlers = [
  http.get('/api/links/:token', async ({ params }) => {
    const failure = await linkGuard();
    if (failure) return failure;
    const found = resolve(String(params.token));
    if (found === null) return notValid();
    if (found === 'expired') {
      const envelope: LinkEnvelope = { state: 'expired', view: null };
      return HttpResponse.json(envelope);
    }
    const view = buildView(found.link, found.project);
    if (!view) return notValid();
    const envelope: LinkEnvelope = { state: 'ok', view };
    return HttpResponse.json(envelope);
  }),

  // Form autosave: answers are kept as a draft until the expert submits.
  http.patch('/api/links/:token', async ({ params, request }) => {
    const failure = await linkGuard();
    if (failure) return failure;
    const found = resolve(String(params.token));
    if (found === null || found === 'expired' || found.link.purpose !== 'form') return notValid();
    const parsed = linkDraftSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse(400, 'invalid', 'We couldn’t save your answers.');
    const { link, project } = found;
    db.update((draft) => {
      const response = draft.adminResponses[project.id]?.responses.find(
        (r) => r.linkToken === link.token,
      );
      if (!response || response.status === 'submitted') return;
      response.answers = parsed.data.answers;
      response.status = 'in_progress';
      response.answered = parsed.data.answers.filter((a) => a.cantSpeak || a.text.trim()).length;
    });
    return HttpResponse.json({ savedAt: new Date().toISOString() });
  }),

  http.post('/api/links/:token/submit', async ({ params, request }) => {
    const failure = await linkGuard();
    if (failure) return failure;
    const found = resolve(String(params.token));
    if (found === null || found === 'expired') return notValid();
    const { link, project } = found;
    const body: unknown = await request.json().catch(() => null);
    const now = new Date();
    const bad = (message: string) => errorResponse(400, 'invalid', message);

    if (link.purpose === 'form') {
      const parsed = formSubmitSchema.safeParse(body);
      if (!parsed.success) return bad('Check your answers and try again.');
      db.update((draft) => {
        const response = draft.adminResponses[project.id]?.responses.find(
          (r) => r.linkToken === link.token,
        );
        if (!response) return;
        response.answers = parsed.data.answers;
        response.answered = parsed.data.answers.filter((a) => a.cantSpeak || a.text.trim()).length;
        response.status = 'submitted';
        response.submittedAt = now.toISOString();
        response.quality ??= 76;
        response.coverage = parsed.data.answers
          .filter((a) => a.text.trim() && !a.cantSpeak)
          .map((a) => a.questionId)
          .slice(0, 6);
        const bundle = draft.adminResponses[project.id];
        if (bundle)
          bundle.submitted = bundle.responses.filter((r) => r.status === 'submitted').length;
        const p = draft.adminProjects[project.id];
        if (p && bundle) p.pendingExpertReviews = bundle.submitted;
      });
      return HttpResponse.json({ ok: true });
    }

    if (link.purpose === 'availability') {
      const parsed = availabilitySubmitSchema.safeParse(body);
      if (!parsed.success) return bad('Choose at least one time.');
      db.update((draft) => {
        const row = draft.adminAvailability[project.id]?.experts.find(
          (e) => e.expertId === link.recordId,
        );
        if (row) {
          row.slots = row.slots.filter((s) => parsed.data.slotIds.includes(s.id));
          row.status = 'confirmed';
        }
        const stored = draft.adminLinks[link.token];
        if (stored) stored.usedAt = now.toISOString();
      });
      return HttpResponse.json({ ok: true });
    }

    if (link.purpose === 'pick') {
      const parsed = clientPickSchema.safeParse(body);
      if (!parsed.success) return bad('Choose 1 or 2 experts, each with a time.');
      const send = db.get().adminClientSends[project.id];
      if (!send) return notValid();
      if (parsed.data.picks.length > send.pickLimit) {
        return bad(`Choose up to ${send.pickLimit} experts.`);
      }
      const picks = parsed.data.picks.map((p) => ({
        expertId: p.expertId,
        slotId: p.slotId,
        letter: send.experts.find((e) => e.expertId === p.expertId)?.letter ?? '?',
      }));
      db.update((draft) => {
        const target = draft.adminClientSends[project.id];
        if (!target) return;
        target.picks = picks;
        target.clientNote = parsed.data.note?.trim() || null;
        draft.adminMail.unshift(
          inbound(
            project,
            `Re: ${send.subject}`,
            `I’d like ${picks.map((p) => `Expert ${p.letter}`).join(' and ')}.${
              parsed.data.note ? ` ${parsed.data.note}` : ''
            }`,
            'client_reply',
          ),
        );
      });
      return HttpResponse.json({ ok: true });
    }

    const parsed = onboardSubmitSchema.safeParse(body);
    if (!parsed.success) return bad('Confirm all four steps and enter your rate.');
    db.update((draft) => {
      const campaign = draft.adminOutreach[project.id];
      if (campaign && !campaign.onboardedIds.includes(link.recordId)) {
        campaign.onboardedIds.push(link.recordId);
      }
      const stored = draft.adminLinks[link.token];
      if (stored) stored.usedAt = now.toISOString();
    });
    return HttpResponse.json({ ok: true });
  }),

  // Expert app: invitations (pitches) and upcoming calls. The prototype shows every pitch to
  // the signed-in expert, since the demo persona isn't one of the matched network experts.
  http.get('/api/expert/invitations', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    if (user.role !== 'expert') {
      return errorResponse(403, 'forbidden', 'Invitations are for experts.');
    }
    const failure = injectedError();
    if (failure) return failure;
    const state = db.get();
    const invitations: Invitation[] = Object.values(state.adminLinks)
      .filter((l) => l.purpose === 'form')
      .flatMap((l) => {
        const project = state.adminProjects[l.projectId];
        const response = state.adminResponses[l.projectId]?.responses.find(
          (r) => r.linkToken === l.token,
        );
        if (!project || !response) return [];
        const availability = state.adminLinks[`lnk_avail_${l.projectId}_${l.recordId}`];
        return [
          {
            token: l.token,
            projectId: l.projectId,
            title: shortName(project.name),
            pay: '$450 / hour · 60 min',
            expiresAt: l.expiresAt,
            status:
              response.status === 'submitted'
                ? ('submitted' as const)
                : response.status === 'in_progress'
                  ? ('in_progress' as const)
                  : ('new' as const),
            answered: response.answered,
            total: response.total,
            availabilityToken: availability?.token ?? null,
          },
        ];
      })
      .slice(0, 12);
    return HttpResponse.json(invitations);
  }),

  http.get('/api/expert/upcoming', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    if (user.role !== 'expert') return errorResponse(403, 'forbidden', 'Calls are for experts.');
    const failure = injectedError();
    if (failure) return failure;
    const state = db.get();
    const calls: UpcomingCall[] = Object.values(state.adminBooked).flatMap((booked) => {
      const project = state.adminProjects[booked.projectId];
      return booked.bookings.map((b, i) => ({
        id: `call_${booked.projectId}_${i + 1}`,
        projectId: booked.projectId,
        title: shortName(project?.name ?? booked.projectId),
        slotLabel: b.slot.label,
        startsAt: b.slot.startsAt,
        inviteLink: b.inviteLink,
        briefingReady: b.briefingReady,
        // The client's name is shown only once the project is booked.
        clientName: project?.client.name ?? 'Client',
      }));
    });
    return HttpResponse.json(calls);
  }),
];
