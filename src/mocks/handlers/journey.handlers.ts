import { http, HttpResponse, type PathParams } from 'msw';
import { z } from 'zod';
import {
  availabilityPatchSchema,
  availabilityBundleSchema,
  bookedProjectSchema,
  callPatchSchema,
  callWorkspaceSchema,
  clientPatchSchema,
  clientSendPatchSchema,
  clientSendSchema,
  expertPatchSchema,
  newProjectSchema,
  outreachActionSchema,
  outreachCampaignSchema,
  outreachPosterPatchSchema,
  pitchPatchSchema,
  pitchSchema,
  responsePatchSchema,
  responsesBundleSchema,
  teamInviteSchema,
  teamPatchSchema,
  type AvailabilityBundle,
  type CallSummary,
  type CallWorkspace,
  type MailMessage,
  type MatchedExpert,
  type OutreachCampaign,
  type OutreachSummary,
  type Project,
  type QuestionnaireResponse,
  type ResponsesBundle,
  type SecureLink,
} from '@/features/admin';
import { createId } from '@/shared/lib/id';
import {
  buildAvailability,
  buildBooked,
  buildCallWorkspace,
  buildClientSend,
  buildOutreachCampaign,
  buildPitch,
  buildResponsesAfterSend,
  mailOut,
} from '../ai/admin/journey';
import { seedClients, seedExpertDirectory } from '../fixtures/admin/directory';
import { PM_NAME, PROJECTS_INBOX } from '../fixtures/admin/seed';
import { getControls } from '../controls';
import { db, type DemoState } from '../store/db';
import { findProject, guard, notFound, withActivity } from './admin.handlers';
import { errorResponse } from './utils';

type Ctx = { params: PathParams; request: Request };
const HOUR = 60 * 60_000;

/** Drop one record without `delete` on a computed key. */
function forget<T extends Record<string, unknown>>(record: T, key: string): T {
  return Object.fromEntries(Object.entries(record).filter(([id]) => id !== key)) as T;
}

function shortName(name: string) {
  const dash = name.indexOf('—');
  return dash > 0 ? name.slice(0, dash).trim() : name;
}

async function readBody<S extends z.ZodType>(request: Request, schema: S) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

const invalid = (message: string) => errorResponse(400, 'invalid', message);
const conflict = (message: string) => errorResponse(409, 'conflict', message);

/** A project route: admin guard + project lookup, then the handler. */
function projectRoute(handler: (project: Project, ctx: Ctx) => Response | Promise<Response>) {
  return async (ctx: Ctx) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(ctx.params.id);
    if (!project) return notFound();
    return handler(project, ctx);
  };
}

/** A directory route: admin guard only. */
function adminRoute(handler: (ctx: Ctx) => Response | Promise<Response>) {
  return async (ctx: Ctx) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    return handler(ctx);
  };
}

function audit(
  draft: DemoState,
  actor: string,
  action: string,
  projectId: string | null,
  now: Date,
) {
  draft.adminAudit.unshift({
    id: createId('aud'),
    at: now.toISOString(),
    actor,
    action,
    projectId,
  });
}

function link(
  purpose: SecureLink['purpose'],
  token: string,
  project: Project,
  recordId: string,
  expiresAt: string,
): SecureLink {
  return { token, purpose, projectId: project.id, recordId, expiresAt, usedAt: null };
}

function mail(
  project: Project | null,
  to: string,
  subject: string,
  body: string,
  kind: MailMessage['kind'],
  now: Date,
  linkToken: string | null = null,
): MailMessage {
  return mailOut(
    { projectId: project?.id ?? null, from: PROJECTS_INBOX, to, subject, body, kind, linkToken },
    now,
  );
}

/** Saves the project with a new activity line and an optional patch (status, counters). */
function setProject(
  draft: DemoState,
  project: Project,
  patch: Partial<Project>,
  actor: 'pm' | 'ai',
  text: string,
  now: Date,
) {
  draft.adminProjects[project.id] = withActivity({ ...project, ...patch }, actor, text, now);
}

function ensureCampaign(project: Project, now: Date): OutreachCampaign {
  return db.get().adminOutreach[project.id] ?? buildOutreachCampaign(project, now);
}

function outreachResponses(
  project: Project,
  campaign: OutreachCampaign,
  now: Date,
): ResponsesBundle {
  const picked = campaign.applicants.filter((a) => campaign.topIds.includes(a.id));
  const expiresAt = new Date(now.getTime() + 48 * HOUR).toISOString();
  const responses: QuestionnaireResponse[] = picked.map((a, index) => {
    const onboarded = campaign.onboardedIds.includes(a.id);
    return {
      id: `resp_${a.id}`,
      projectId: project.id,
      expertId: a.id,
      displayId: a.name,
      role: 'Plant leader, battery recycling (outreach)',
      country: 'EU',
      status: 'submitted',
      answered: 15,
      total: 15,
      quality: 84 - index * 2,
      coverage: project.questions.slice(0, 6).map((q) => q.id),
      complianceSigned: onboarded,
      selected: onboarded,
      answers: [],
      submittedAt: now.toISOString(),
      linkToken: `lnk_form_${project.id}_${a.id}`,
      expiresAt,
    };
  });
  return {
    projectId: project.id,
    invited: responses.length,
    submitted: responses.length,
    aiPickIds: responses.filter((r) => r.selected).map((r) => r.expertId),
    responses,
  };
}

const expertIdsSchema = z.object({ expertIds: z.array(z.string()).min(1) });

const pitchRoutes = [
  http.get(
    '/api/admin/projects/:id/pitch',
    projectRoute((project) => {
      const pitch = db.get().adminPitches[project.id];
      if (!pitch) {
        return errorResponse(
          404,
          'not_found',
          'No pitch yet. Pick experts on the shortlist first.',
        );
      }
      return HttpResponse.json(pitchSchema.parse(pitch));
    }),
  ),

  http.post(
    '/api/admin/projects/:id/pitch',
    projectRoute(async (project, { request }) => {
      const input = await readBody(request, expertIdsSchema);
      if (!input) return invalid('Choose at least one expert to pitch.');
      const shortlist = db.get().adminShortlists[project.id];
      if (!shortlist) return conflict('Generate a shortlist before pitching experts.');
      const existing = db.get().adminPitches[project.id];
      if (existing?.sentAt) return HttpResponse.json(existing);
      const now = new Date();
      const built = buildPitch(project, shortlist, input.expertIds, now);
      const pitch = existing
        ? {
            ...built,
            subject: existing.subject,
            body: existing.body,
            answerByHours: existing.answerByHours,
            reminder: existing.reminder,
            hideClientName: existing.hideClientName,
            askCompliance: existing.askCompliance,
            questions: existing.questions,
          }
        : built;
      db.update((draft) => {
        draft.adminPitches[project.id] = pitch;
        setProject(
          draft,
          project,
          { status: 'pitching' },
          'ai',
          `AI drafted the pitch for ${pitch.recipients.length} experts`,
          now,
        );
      });
      return HttpResponse.json(pitch);
    }),
  ),

  http.patch(
    '/api/admin/projects/:id/pitch',
    projectRoute(async (project, { request }) => {
      const pitch = db.get().adminPitches[project.id];
      if (!pitch) return notFound();
      if (pitch.sentAt) return conflict('This pitch was already sent.');
      const patch = await readBody(request, pitchPatchSchema);
      if (!patch) return invalid('Check the subject, message and questions.');
      const next = { ...pitch, ...patch, updatedAt: new Date().toISOString() };
      db.update((draft) => {
        draft.adminPitches[project.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/pitch/send',
    projectRoute((project) => {
      const pitch = db.get().adminPitches[project.id];
      if (!pitch) return conflict('Draft the pitch first.');
      if (pitch.sentAt) return HttpResponse.json(pitch);
      const now = new Date();
      const { bundle, links } = buildResponsesAfterSend(project, pitch, now);
      const sent = { ...pitch, sentAt: now.toISOString() };
      db.update((draft) => {
        draft.adminPitches[project.id] = sent;
        draft.adminResponses[project.id] = bundle;
        for (const l of links) {
          draft.adminLinks[l.token] = link('form', l.token, project, l.expertId, l.expiresAt);
        }
        for (const r of pitch.recipients) {
          const token = `lnk_form_${project.id}_${r.id}`;
          draft.adminMail.unshift(
            mail(
              project,
              `expert-${r.id}@mail.example`,
              pitch.subject,
              pitch.body,
              'pitch',
              now,
              token,
            ),
          );
        }
        setProject(
          draft,
          project,
          { pendingExpertReviews: bundle.submitted },
          'pm',
          `You sent the pitch to ${pitch.recipients.length} experts`,
          now,
        );
        audit(
          draft,
          PM_NAME,
          `Sent pitch for ${project.id} to ${pitch.recipients.length} experts`,
          project.id,
          now,
        );
      });
      return HttpResponse.json(sent);
    }),
  ),
];

const responseRoutes = [
  http.get(
    '/api/admin/projects/:id/responses',
    projectRoute((project) => {
      const bundle = db.get().adminResponses[project.id];
      if (!bundle)
        return errorResponse(404, 'not_found', 'No responses yet. Send the pitch first.');
      return HttpResponse.json(responsesBundleSchema.parse(bundle));
    }),
  ),

  http.patch(
    '/api/admin/projects/:id/responses',
    projectRoute(async (project, { request }) => {
      const bundle = db.get().adminResponses[project.id];
      if (!bundle) return notFound();
      const patch = await readBody(request, responsePatchSchema);
      if (!patch?.selectedIds) return invalid('Choose which experts to confirm.');
      if (patch.selectedIds.length > 5) return invalid('Pick up to 5 experts for the client.');
      const selected = new Set(patch.selectedIds);
      const next = {
        ...bundle,
        responses: bundle.responses.map((r) => ({
          ...r,
          selected: selected.has(r.expertId) && r.status === 'submitted',
        })),
      };
      db.update((draft) => {
        draft.adminResponses[project.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/confirm-availability',
    projectRoute((project) => {
      const bundle = db.get().adminResponses[project.id];
      const existing = db.get().adminAvailability[project.id];
      const sentToClient = db.get().adminClientSends[project.id]?.sentAt;
      if (existing && sentToClient) return HttpResponse.json(existing);
      if (!bundle || !bundle.responses.some((r) => r.selected)) {
        return conflict('Select at least one expert who answered before confirming availability.');
      }
      const now = new Date();
      const availability = buildAvailability(project, bundle, now);
      const expiresAt = new Date(now.getTime() + availability.holdHours * HOUR).toISOString();
      db.update((draft) => {
        draft.adminAvailability[project.id] = availability;
        draft.adminClientSends = forget(draft.adminClientSends, project.id);
        for (const row of availability.experts) {
          const token = `lnk_avail_${project.id}_${row.expertId}`;
          draft.adminLinks[token] = link('availability', token, project, row.expertId, expiresAt);
          draft.adminMail.unshift(
            mail(
              project,
              `expert-${row.expertId}@mail.example`,
              `Confirm your times for ${shortName(project.name)}`,
              'Please confirm the times you can talk. We hold them for 48 hours.',
              'availability',
              now,
              token,
            ),
          );
        }
        setProject(
          draft,
          project,
          { status: 'scheduling' },
          'pm',
          `You confirmed availability for ${availability.experts.length} experts`,
          now,
        );
        audit(draft, PM_NAME, `Confirmed availability for ${project.id}`, project.id, now);
      });
      return HttpResponse.json(availability);
    }),
  ),

  http.get(
    '/api/admin/projects/:id/availability',
    projectRoute((project) => {
      const availability = db.get().adminAvailability[project.id];
      if (!availability) {
        return errorResponse(404, 'not_found', 'No availability yet. Confirm experts first.');
      }
      return HttpResponse.json(availabilityBundleSchema.parse(availability));
    }),
  ),

  http.patch(
    '/api/admin/projects/:id/availability',
    projectRoute(async (project, { request }) => {
      const availability = db.get().adminAvailability[project.id];
      if (!availability) return notFound();
      const patch = await readBody(request, availabilityPatchSchema);
      if (!patch) return invalid('Check the hold settings.');
      const next: AvailabilityBundle = { ...availability, ...patch };
      db.update((draft) => {
        draft.adminAvailability[project.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),
];

const clientRoutes = [
  http.get(
    '/api/admin/projects/:id/client-send',
    projectRoute((project) => {
      const availability = db.get().adminAvailability[project.id];
      const bundle = db.get().adminResponses[project.id];
      if (!availability || !bundle) {
        return errorResponse(
          404,
          'not_found',
          'Confirm availability before writing to the client.',
        );
      }
      let send = db.get().adminClientSends[project.id];
      if (!send) {
        send = buildClientSend(project, availability, bundle, new Date());
        const created = send;
        db.update((draft) => {
          draft.adminClientSends[project.id] = created;
        });
      }
      return HttpResponse.json(clientSendSchema.parse(send));
    }),
  ),

  http.patch(
    '/api/admin/projects/:id/client-send',
    projectRoute(async (project, { request }) => {
      const send = db.get().adminClientSends[project.id];
      if (!send) return notFound();
      if (send.sentAt) return conflict('The email was already sent.');
      const patch = await readBody(request, clientSendPatchSchema);
      if (!patch) return invalid('Check the subject and message.');
      const { removeExpertId, ...rest } = patch;
      const experts = removeExpertId
        ? send.experts.filter((e) => e.expertId !== removeExpertId)
        : send.experts;
      const letters = new Set(experts.map((e) => e.letter));
      const next = {
        ...send,
        ...rest,
        experts,
        coverage: send.coverage.map((c) => ({
          ...c,
          letters: c.letters.filter((l) => letters.has(l)),
        })),
      };
      db.update((draft) => {
        draft.adminClientSends[project.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/send-to-client',
    projectRoute((project) => {
      const send = db.get().adminClientSends[project.id];
      if (!send) return conflict('Draft the client email first.');
      if (send.sentAt) return HttpResponse.json(send);
      if (send.experts.length === 0) return conflict('Keep at least one expert in the email.');
      const now = new Date();
      const sent = { ...send, sentAt: now.toISOString() };
      db.update((draft) => {
        draft.adminClientSends[project.id] = sent;
        draft.adminLinks[send.pickToken] = link(
          'pick',
          send.pickToken,
          project,
          project.id,
          send.replyBy,
        );
        draft.adminMail.unshift(
          mail(
            project,
            project.contact.email,
            send.subject,
            send.body,
            'client_send',
            now,
            send.pickToken,
          ),
        );
        setProject(
          draft,
          project,
          { status: 'waiting_on_client' },
          'pm',
          `You sent ${send.experts.length} experts to ${project.contact.name}`,
          now,
        );
        audit(draft, PM_NAME, `Sent experts to the client for ${project.id}`, project.id, now);
      });
      return HttpResponse.json(sent);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/client-send/sync',
    projectRoute((project) => {
      const send = db.get().adminClientSends[project.id];
      if (!send?.sentAt) return conflict('Send the experts to the client first.');
      if (!send.picks) return conflict('Wait for the client’s reply before syncing.');
      if (send.syncedAt) return HttpResponse.json(send);
      const now = new Date();
      const synced = { ...send, syncedAt: now.toISOString() };
      db.update((draft) => {
        draft.adminClientSends[project.id] = synced;
        for (const pick of send.picks ?? []) {
          draft.adminMail.unshift(
            mail(
              project,
              `expert-${pick.expertId}@mail.example`,
              `You’re booked: ${shortName(project.name)}`,
              'The client chose you. Your time is confirmed; the invite follows.',
              'availability',
              now,
            ),
          );
        }
        draft.adminProjects[project.id] = withActivity(
          project,
          'pm',
          'You synced the client’s choice with the experts',
          now,
        );
      });
      return HttpResponse.json(synced);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/client-send/lock',
    projectRoute((project) => {
      const send = db.get().adminClientSends[project.id];
      if (!send?.syncedAt) return conflict('Sync with the experts before locking the project.');
      const existing = db.get().adminBooked[project.id];
      if (existing) return HttpResponse.json(existing);
      const now = new Date();
      const booked = buildBooked(project, send, now);
      db.update((draft) => {
        draft.adminBooked[project.id] = booked;
        draft.adminMail.unshift(
          mail(
            project,
            project.contact.email,
            `Locked: your calls for ${shortName(project.name)}`,
            'Both experts are confirmed. Invites and the briefing pack follow 24 hours before each call.',
            'client_send',
            now,
          ),
        );
        setProject(draft, project, { status: 'booked' }, 'pm', 'You locked the project', now);
        audit(draft, PM_NAME, `Locked ${project.id} (${booked.version})`, project.id, now);
      });
      return HttpResponse.json(booked);
    }),
  ),

  http.get(
    '/api/admin/projects/:id/booked',
    projectRoute((project) => {
      const booked = db.get().adminBooked[project.id];
      if (!booked) return errorResponse(404, 'not_found', 'This project isn’t locked yet.');
      return HttpResponse.json(bookedProjectSchema.parse(booked));
    }),
  ),
];

function callFor(project: Project, callId: string): CallWorkspace | null {
  const stored = db.get().adminCalls[callId];
  if (stored) return stored;
  const match = /^call_.+_(\d+)$/.exec(callId);
  if (!match || !callId.startsWith(`call_${project.id}_`)) return null;
  const index = Number(match[1]) - 1;
  const booking = db.get().adminBooked[project.id]?.bookings[index];
  const base = buildCallWorkspace(project, new Date());
  const first = index === 0;
  return {
    ...base,
    id: callId,
    title: `${shortName(project.name)} · Call ${index + 1}`,
    ...(booking ? { expertLetter: booking.letter, expertRole: booking.role } : {}),
    status: first ? 'live' : 'scheduled',
    startedAt: first ? base.startedAt : null,
    transcript: first ? base.transcript : [],
    requests: first ? base.requests : [],
  };
}

const callRoutes = [
  http.get(
    '/api/admin/calls',
    adminRoute(() => {
      if (getControls().emptyData) return HttpResponse.json([]);
      const { adminBooked, adminProjects, adminCalls } = db.get();
      const calls: CallSummary[] = Object.values(adminBooked).flatMap((booked) => {
        const project = adminProjects[booked.projectId];
        return booked.bookings.map((b, i) => {
          const id = `call_${booked.projectId}_${i + 1}`;
          return {
            id,
            projectId: booked.projectId,
            projectName: project?.name ?? booked.projectId,
            title: `${shortName(project?.name ?? booked.projectId)} · Call ${i + 1}`,
            expertLetter: b.letter,
            expertRole: b.role,
            slotLabel: b.slot.label,
            status: adminCalls[id]?.status ?? ('scheduled' as const),
          };
        });
      });
      return HttpResponse.json(calls);
    }),
  ),

  http.get(
    '/api/admin/projects/:id/calls/:callId',
    projectRoute((project, { params }) => {
      const callId = String(params.callId);
      const call = callFor(project, callId);
      if (!call) return errorResponse(404, 'not_found', 'We couldn’t find that call.');
      return HttpResponse.json(callWorkspaceSchema.parse(call));
    }),
  ),

  http.patch(
    '/api/admin/projects/:id/calls/:callId',
    projectRoute(async (project, { params, request }) => {
      const call = callFor(project, String(params.callId));
      if (!call) return notFound();
      const patch = await readBody(request, callPatchSchema);
      if (!patch) return invalid('Choose what to change.');
      const next: CallWorkspace = {
        ...call,
        status: patch.status ?? call.status,
        startedAt: patch.status === 'live' ? new Date().toISOString() : call.startedAt,
        questionsCovered: call.questionsCovered.map((q) =>
          q.id === patch.coveredId ? { ...q, covered: !q.covered } : q,
        ),
      };
      db.update((draft) => {
        draft.adminCalls[next.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/calls/:callId/send-all',
    projectRoute((project, { params }) => {
      const call = callFor(project, String(params.callId));
      if (!call) return notFound();
      const now = new Date();
      const next: CallWorkspace = { ...call, status: 'ended' };
      db.update((draft) => {
        draft.adminCalls[next.id] = next;
        draft.adminMail.unshift(
          mail(
            project,
            project.contact.email,
            `After the call: documents for ${shortName(project.name)}`,
            `Attached: ${call.documents.map((d) => d.name).join(', ') || 'no documents'}.`,
            'client_send',
            now,
          ),
        );
        audit(draft, PM_NAME, `Sent after-call documents for ${project.id}`, project.id, now);
      });
      return HttpResponse.json(next);
    }),
  ),
];

function summariseOutreach(project: Project): OutreachSummary {
  const campaign = db.get().adminOutreach[project.id];
  return {
    projectId: project.id,
    projectName: project.name,
    clientName: project.client.name,
    status: campaign?.status ?? 'not_started',
    applicants: campaign?.applicants.length ?? 0,
    requirement: campaign?.blockingRequirement ?? project.requirements[0]?.text ?? 'No match yet',
  };
}

const outreachRoutes = [
  http.get(
    '/api/admin/outreach',
    adminRoute(() => {
      if (getControls().emptyData) return HttpResponse.json([]);
      const { adminProjects, adminOutreach } = db.get();
      const rows = Object.values(adminProjects)
        .filter(
          (p) =>
            adminOutreach[p.id] ||
            p.status === 'outreach' ||
            (p.status === 'matching' && p.id !== 'PRJ-1042'),
        )
        .map(summariseOutreach);
      return HttpResponse.json(rows);
    }),
  ),

  http.get(
    '/api/admin/projects/:id/outreach',
    projectRoute((project) =>
      HttpResponse.json(outreachCampaignSchema.parse(ensureCampaign(project, new Date()))),
    ),
  ),

  http.patch(
    '/api/admin/projects/:id/outreach',
    projectRoute(async (project, { request }) => {
      const campaign = ensureCampaign(project, new Date());
      const patch = await readBody(request, outreachPosterPatchSchema);
      if (!patch) return invalid('Check the poster fields.');
      const next = { ...campaign, poster: { ...campaign.poster, ...patch } };
      db.update((draft) => {
        draft.adminOutreach[project.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    '/api/admin/projects/:id/outreach',
    projectRoute(async (project, { request }) => {
      const input = await readBody(request, outreachActionSchema);
      if (!input) return invalid('Choose an outreach action.');
      const now = new Date();
      const campaign = ensureCampaign(project, now);
      let next = campaign;
      let activity: string | null = null;
      let projectPatch: Partial<Project> = {};
      const extraMail: MailMessage[] = [];
      const extraLinks: SecureLink[] = [];
      let bundle: ResponsesBundle | null = null;
      let matches: MatchedExpert[] | null = null;

      switch (input.action) {
        case 'start':
          projectPatch = { status: 'outreach' };
          activity = 'You started outreach hiring';
          break;
        case 'publish':
          next = { ...campaign, status: 'published', publishedAt: now.toISOString() };
          activity = 'You published the hiring poster';
          break;
        case 'send_client_update':
          next = { ...campaign, clientUpdateSentAt: now.toISOString() };
          extraMail.push(
            mail(
              project,
              project.contact.email,
              `Update on ${shortName(project.name)}: recruiting new experts`,
              `Hi ${project.contact.name.split(' ')[0]} — no one in the network meets “${campaign.blockingRequirement}”. We’re recruiting and will send options by ${campaign.poster.deadline}.`,
              'client_send',
              now,
            ),
          );
          activity = `You told ${project.contact.name} we’re recruiting`;
          break;
        case 'toggle_applicant':
          next = {
            ...campaign,
            applicants: campaign.applicants.map((a) =>
              a.id === input.applicantId && a.tag !== 'conflict'
                ? { ...a, selected: !a.selected }
                : a,
            ),
          };
          break;
        case 'send_questions': {
          const chosen = campaign.applicants.filter((a) => a.selected);
          if (chosen.length === 0) return conflict('Tick at least one applicant first.');
          const rank = { fits_all: 0, fits_partial: 1, not_a_fit: 2, conflict: 3 } as const;
          const top = chosen
            .slice()
            .sort((a, b) => rank[a.tag] - rank[b.tag])
            .slice(0, 4)
            .map((a) => a.id);
          next = {
            ...campaign,
            status: 'screening',
            questionsSentAt: now.toISOString(),
            topIds: top,
          };
          for (const a of chosen) {
            extraMail.push(
              mail(
                project,
                a.email,
                `${project.id}: 15 quick questions`,
                'Thanks for applying. Please answer the 15 questions to be considered.',
                'other',
                now,
              ),
            );
          }
          activity = `You sent 15 questions to ${chosen.length} applicants`;
          break;
        }
        case 'add_top': {
          const expiresAt = new Date(now.getTime() + 7 * 24 * HOUR).toISOString();
          next = { ...campaign, status: 'onboarding', topIds: input.ids };
          for (const id of input.ids) {
            const applicant = campaign.applicants.find((a) => a.id === id);
            if (!applicant) continue;
            const token = `lnk_onb_${project.id}_${id}`;
            extraLinks.push(link('onboard', token, project, id, expiresAt));
            extraMail.push(
              mail(
                project,
                applicant.email,
                `Join Xpert Network for ${project.id}`,
                'Four quick steps: identity, terms, rate and payment details.',
                'other',
                now,
                token,
              ),
            );
          }
          activity = `You added ${input.ids.length} applicants to the project`;
          break;
        }
        case 'mark_onboarded':
          next = {
            ...campaign,
            onboardedIds: campaign.onboardedIds.includes(input.applicantId)
              ? campaign.onboardedIds
              : [...campaign.onboardedIds, input.applicantId],
          };
          break;
        case 'complete': {
          if (campaign.onboardedIds.length === 0) {
            return conflict('Onboard at least one expert before finishing outreach.');
          }
          next = { ...campaign, status: 'done' };
          bundle = outreachResponses(project, next, now);
          matches = campaign.applicants
            .filter((a) => campaign.onboardedIds.includes(a.id))
            .map((a, i) => ({
              id: a.id,
              label: `${a.name} (new)`,
              role: 'Plant leader, battery recycling',
              years: 14 + i,
              country: 'PL',
              matchPercent: 90 - i * 2,
              lastEngagedAt: null,
              pinned: true,
              excluded: false,
              whyPicked: ['Answered all 15 questions through outreach'],
              questionsCovered: 6,
              compliance: 'cleared' as const,
              rateHint: '$480',
            }));
          projectPatch = { status: 'matching' };
          activity = `Outreach added ${matches.length} experts to the project`;
          break;
        }
      }

      db.update((draft) => {
        draft.adminOutreach[project.id] = next;
        for (const m of extraMail) draft.adminMail.unshift(m);
        for (const l of extraLinks) draft.adminLinks[l.token] = l;
        if (bundle) draft.adminResponses[project.id] = bundle;
        if (matches) {
          const existing = draft.adminMatches[project.id];
          draft.adminMatches[project.id] = {
            projectId: project.id,
            searchedAt: now.toISOString(),
            searchedCount: existing?.searchedCount ?? 18_240,
            durationMs: existing?.durationMs ?? 1800,
            filters: existing?.filters ?? ['Profile requirements'],
            experts: matches,
          };
        }
        if (activity || Object.keys(projectPatch).length > 0) {
          setProject(draft, project, projectPatch, 'pm', activity ?? 'Outreach updated', now);
        }
        if (activity) audit(draft, PM_NAME, `${activity} (${project.id})`, project.id, now);
      });
      return HttpResponse.json(next);
    }),
  ),
];

function nextProjectId(projects: Record<string, Project>) {
  const max = Object.keys(projects).reduce((m, id) => {
    const n = Number(/^PRJ-(\d+)$/.exec(id)?.[1] ?? 0);
    return Math.max(m, n);
  }, 1000);
  return `PRJ-${max + 1}`;
}

const trashDays = 30;

function toTrash(
  draft: DemoState,
  kind: 'project' | 'expert' | 'client',
  label: string,
  now: Date,
) {
  const id = createId('trash');
  draft.adminTrash[id] = {
    id,
    kind,
    label,
    deletedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + trashDays * 24 * HOUR).toISOString(),
    daysLeft: trashDays,
  };
}

const noContent = () => new HttpResponse(null, { status: 204 });

const directoryRoutes = [
  http.post(
    '/api/admin/projects',
    adminRoute(async ({ request }) => {
      const input = await readBody(request, newProjectSchema);
      if (!input) return invalid('Check the highlighted fields and try again.');
      const client = db.get().adminClients[input.clientId];
      if (!client) return invalid('Choose a client.');
      const now = new Date();
      const id = nextProjectId(db.get().adminProjects);
      const iso = now.toISOString();
      const project: Project = {
        id,
        name: input.name,
        status: 'draft',
        client: { id: client.id, name: client.name },
        contact: { name: input.contactName, email: input.contactEmail },
        owner: PM_NAME,
        source: { requestId: null, fileName: null },
        createdAt: iso,
        approvedAt: null,
        version: 'v0.1',
        brief: input.brief,
        requirements: [],
        questions: [],
        ai: { brief: input.brief, requirements: [], questions: [] },
        briefLength: 'standard',
        facts: [],
        confirmations: [],
        activity: [{ id: createId('act'), at: iso, actor: 'pm', text: 'You created the project' }],
        document: { pageCount: 1, pages: [{ page: 1, blocks: [] }] },
        pendingExpertReviews: 0,
      };
      db.update((draft) => {
        draft.adminProjects[id] = project;
        audit(draft, PM_NAME, `Created project ${id}`, id, now);
      });
      return HttpResponse.json(project, { status: 201 });
    }),
  ),

  http.delete(
    '/api/admin/projects/:id',
    projectRoute((project) => {
      const now = new Date();
      db.update((draft) => {
        setProject(
          draft,
          project,
          { status: 'archived' },
          'pm',
          'You moved the project to trash',
          now,
        );
        toTrash(draft, 'project', `${project.id} · ${project.name}`, now);
        audit(draft, PM_NAME, `Moved ${project.id} to trash`, project.id, now);
      });
      return noContent();
    }),
  ),

  http.get(
    '/api/admin/clients',
    adminRoute(() =>
      HttpResponse.json(getControls().emptyData ? [] : Object.values(db.get().adminClients)),
    ),
  ),
  http.patch(
    '/api/admin/clients/:id',
    adminRoute(async ({ params, request }) => {
      const client = db.get().adminClients[String(params.id)];
      if (!client) return notFound();
      const patch = await readBody(request, clientPatchSchema);
      if (!patch) return invalid('Check the client settings.');
      const next = { ...client, ...patch };
      db.update((draft) => {
        draft.adminClients[client.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),
  http.delete(
    '/api/admin/clients/:id',
    adminRoute(({ params }) => {
      const client = db.get().adminClients[String(params.id)];
      if (!client) return notFound();
      const now = new Date();
      db.update((draft) => {
        draft.adminClients = forget(draft.adminClients, client.id);
        toTrash(draft, 'client', client.name, now);
        audit(draft, PM_NAME, `Moved client ${client.name} to trash`, null, now);
      });
      return noContent();
    }),
  ),

  http.get(
    '/api/admin/experts',
    adminRoute(() =>
      HttpResponse.json(getControls().emptyData ? [] : Object.values(db.get().adminExperts)),
    ),
  ),
  http.patch(
    '/api/admin/experts/:id',
    adminRoute(async ({ params, request }) => {
      const expert = db.get().adminExperts[String(params.id)];
      if (!expert) return notFound();
      const patch = await readBody(request, expertPatchSchema);
      if (!patch) return invalid('Check the expert details.');
      const next = { ...expert, ...patch };
      db.update((draft) => {
        draft.adminExperts[expert.id] = next;
      });
      return HttpResponse.json(next);
    }),
  ),
  http.delete(
    '/api/admin/experts/:id',
    adminRoute(({ params }) => {
      const expert = db.get().adminExperts[String(params.id)];
      if (!expert) return notFound();
      const now = new Date();
      db.update((draft) => {
        draft.adminExperts = forget(draft.adminExperts, expert.id);
        toTrash(draft, 'expert', expert.displayId, now);
        audit(draft, PM_NAME, `Moved ${expert.displayId} to trash`, null, now);
      });
      return noContent();
    }),
  ),

  http.get(
    '/api/admin/trash',
    adminRoute(() =>
      HttpResponse.json(
        Object.values(db.get().adminTrash).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
      ),
    ),
  ),
  http.post(
    '/api/admin/trash/:id/restore',
    adminRoute(({ params }) => {
      const entry = db.get().adminTrash[String(params.id)];
      if (!entry) return notFound();
      db.update((draft) => {
        draft.adminTrash = forget(draft.adminTrash, entry.id);
        if (entry.kind === 'client') {
          const record = Object.values(seedClients()).find((c) => c.name === entry.label);
          if (record) draft.adminClients[record.id] = record;
        } else if (entry.kind === 'expert') {
          const record = Object.values(seedExpertDirectory()).find(
            (e) => e.displayId === entry.label,
          );
          if (record) draft.adminExperts[record.id] = record;
        } else {
          const project = draft.adminProjects[entry.label.split(' · ')[0] ?? ''];
          if (project?.status === 'archived') project.status = 'draft';
        }
        audit(draft, PM_NAME, `Restored ${entry.label} from trash`, null, new Date());
      });
      return HttpResponse.json(entry);
    }),
  ),
  http.delete(
    '/api/admin/trash/:id',
    adminRoute(({ params }) => {
      const entry = db.get().adminTrash[String(params.id)];
      if (!entry) return notFound();
      db.update((draft) => {
        draft.adminTrash = forget(draft.adminTrash, entry.id);
        audit(draft, PM_NAME, `Deleted ${entry.label} forever`, null, new Date());
      });
      return noContent();
    }),
  ),

  http.get(
    '/api/admin/team',
    adminRoute(() => HttpResponse.json(Object.values(db.get().adminTeam))),
  ),
  http.post(
    '/api/admin/team',
    adminRoute(async ({ request }) => {
      const input = await readBody(request, teamInviteSchema);
      if (!input) return invalid('Add a name and a valid email.');
      const id = createId('tm');
      const member = {
        id,
        ...input,
        openProjects: 0,
        bookedProjects: 0,
        avgHoursToBrief: null,
        active: true,
      };
      db.update((draft) => {
        draft.adminTeam[id] = member;
        audit(draft, PM_NAME, `Invited ${input.name} to the team`, null, new Date());
      });
      return HttpResponse.json(member, { status: 201 });
    }),
  ),
  http.patch(
    '/api/admin/team/:id',
    adminRoute(async ({ params, request }) => {
      const member = db.get().adminTeam[String(params.id)];
      if (!member) return notFound();
      const patch = await readBody(request, teamPatchSchema);
      if (!patch) return invalid('Check the change.');
      const next = { ...member, ...patch };
      db.update((draft) => {
        draft.adminTeam[member.id] = next;
        audit(
          draft,
          PM_NAME,
          `${next.active ? 'Reactivated' : 'Deactivated'} ${member.name}`,
          null,
          new Date(),
        );
      });
      return HttpResponse.json(next);
    }),
  ),
  http.get(
    '/api/admin/audit',
    adminRoute(() => HttpResponse.json(db.get().adminAudit)),
  ),
  http.get(
    '/api/admin/mail',
    adminRoute(() => HttpResponse.json(db.get().adminMail)),
  ),
];

export const journeyHandlers = [
  ...pitchRoutes,
  ...responseRoutes,
  ...clientRoutes,
  ...callRoutes,
  ...outreachRoutes,
  ...directoryRoutes,
];
