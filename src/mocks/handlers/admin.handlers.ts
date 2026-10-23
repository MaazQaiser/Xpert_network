import { http, HttpResponse } from 'msw';
import {
  assistantInputSchema,
  availabilityActionSchema,
  addMailAccountInputSchema,
  bookingActionSchema,
  callActionSchema,
  clarificationSchema,
  clientDraftInputSchema,
  expertSearchInputSchema,
  screeningInputSchema,
  generateShortlistInputSchema,
  matchPatchSchema,
  matchResultSchema,
  projectPatchSchema,
  shortlistPatchSchema,
  shortlistSchema,
  type Activity,
  type HomeSummary,
  type MatchResult,
  type Project,
  type ProjectSummary,
} from '@/features/admin';
import { createId } from '@/shared/lib/id';
import { getControls } from '../controls';
import { assistantReply } from '../ai/admin/assistant';
import { buildShortlist, swapOrRemove } from '../ai/admin/shortlist';
import { emptyMatches, seedPrj1042Matches } from '../fixtures/admin/experts';
import { buildResponses } from '../fixtures/admin/responses';
import { buildAvailability } from '../fixtures/admin/availability';
import { buildClientDraft } from '../fixtures/admin/clientDraft';
import { expertPerson } from '../fixtures/admin/expertPeople';
import { buildBooking, buildChecklist, replyInboxRequest } from '../fixtures/admin/booking';
import { buildCallSession } from '../fixtures/admin/call';
import { PM_NAME } from '../fixtures/admin/seed';
import { PRJ_1042_BRIEFS } from '../fixtures/admin/prj1042';
import { db } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

/** Admin endpoints answer only to a signed-in admin. */
async function guard() {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return { response: unauthorized() } as const;
  if (user.role !== 'admin') {
    return {
      response: errorResponse(403, 'forbidden', 'This page is for Xpert Network staff only.'),
    } as const;
  }
  const failure = injectedError();
  if (failure) return { response: failure } as const;
  return { user } as const;
}

const notFound = () =>
  errorResponse(404, 'not_found', 'We couldn’t find that project. It may have been deleted.');

// "Today" on Home means the last 24 hours, so a demo left open over midnight still adds up.
const isToday = (iso: string, now: Date) =>
  now.getTime() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

function findProject(id: unknown): Project | null {
  return typeof id === 'string' ? (db.get().adminProjects[id] ?? null) : null;
}

/** Repeated edits of the same kind within 5 minutes update one activity line. */
function withActivity(project: Project, actor: Activity['actor'], text: string, now: Date) {
  const [latest, ...rest] = project.activity;
  const recent =
    latest && latest.text === text && now.getTime() - new Date(latest.at).getTime() < 5 * 60_000;
  const entry = { id: createId('act'), at: now.toISOString(), actor, text };
  return { ...project, activity: recent ? [entry, ...rest] : [entry, ...project.activity] };
}

function save(project: Project) {
  db.update((draft) => {
    draft.adminProjects[project.id] = project;
  });
  return HttpResponse.json(project);
}

function toSummary(project: Project): ProjectSummary {
  const { id, name, status, client, owner, createdAt, pendingExpertReviews } = project;
  return { id, name, status, client, owner, createdAt, pendingExpertReviews };
}

function draftTip(project: Project): NonNullable<HomeSummary['tip']> {
  const open = project.confirmations.filter((c) => c.state === 'open').length;
  const next =
    open === 0
      ? 'The project file is ready to approve.'
      : `${open === 1 ? '1 thing needs' : `${open} things need`} confirming before matching.`;
  return {
    lead: `Start with ${project.id}`,
    detail: `${project.contact.name} at ${project.client.name} is waiting on experts. ${next}`,
    href: `/admin/projects/${project.id}/brief`,
  };
}

function clarificationDraft(project: Project) {
  const asks = project.confirmations
    .filter((c) => c.state !== 'confirmed')
    .map((c, index) => {
      const fact = project.facts.find((f) => f.id === c.factId);
      if (c.factId === 'f_budget') {
        return fact?.value
          ? `${index + 1}. Budget: you asked us for a quote. Is there a range we should work within?`
          : `${index + 1}. Budget: the brief doesn’t mention one. Is there a range per call or for the project?`;
      }
      if (!fact?.value) {
        return `${index + 1}. ${fact?.label ?? 'Detail'}: the brief doesn’t give one. ${
          c.proposal ? `Shall we plan for ${c.proposal}?` : 'Could you confirm?'
        }`;
      }
      return `${index + 1}. ${fact.label}: you mention ${fact.value}. ${
        c.proposal ? `Shall we plan for ${c.proposal}?` : 'Could you confirm?'
      }`;
    });
  const firstName = project.contact.name.split(' ')[0];
  return {
    to: project.contact.email,
    subject: `Re: ${project.name} (${project.id})`,
    body: [
      `Hi ${firstName},`,
      '',
      `Thanks for the brief. We’ve started on ${project.id}. ${
        asks.length === 1 ? 'One quick thing' : `${asks.length} quick things`
      } before we match experts:`,
      '',
      ...asks,
      '',
      'Best,',
      PM_NAME,
      'Xpert Network',
    ].join('\n'),
  };
}

/** Experts the screen 03 search can find for a project, best match first. */
function searchPool(project: Project) {
  return ensureMatches(project, new Date()).experts;
}

export const adminHandlers = [
  // Screen 03 Experts tab: returns the next batch of matching experts. Unlike /matches it works
  // on a draft project file, so the PM can look before approving. Nothing about the project
  // changes; the "Extend research" criteria are accepted and shape only the batch size here.
  http.post('/api/admin/projects/:id/expert-search', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = expertSearchInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Check the search settings and try again.');
    }
    const pool = getControls().emptyData ? [] : searchPool(project);
    const { offset, limit } = parsed.data;
    const experts = pool.slice(offset, offset + limit);
    return HttpResponse.json({
      experts,
      remaining: Math.max(0, pool.length - offset - experts.length),
      screeningSent: db.get().adminScreening[project.id] ?? [],
    });
  }),

  // Sends the project's client questions to one expert as their screening questions (sandbox).
  http.post('/api/admin/projects/:id/screening', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = screeningInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(400, 'invalid', 'Choose an expert to send to.');
    const current = db.get().adminScreening[project.id] ?? [];
    const next = current.includes(parsed.data.expertId)
      ? current
      : [...current, parsed.data.expertId];
    db.update((draft) => {
      draft.adminScreening[project.id] = next;
      draft.adminScreeningSentAt[project.id] ??= new Date().toISOString();
    });
    return HttpResponse.json({ screeningSent: next });
  }),

  // Screen 08: how the experts who were sent the screening questions have responded.
  http.get('/api/admin/projects/:id/responses', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const sentIds = db.get().adminScreening[project.id] ?? [];
    const pool = searchPool(project);
    const sent = sentIds.flatMap((id) => pool.filter((expert) => expert.id === id));
    return HttpResponse.json(
      buildResponses(project, sent, db.get().adminScreeningSentAt[project.id] ?? null, new Date()),
    );
  }),

  // Screen 09: the experts moved forward and their offered times. `?experts=a,b` records a new
  // selection (from screen 08); without it, the last selection is shown.
  http.get('/api/admin/projects/:id/availability', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const requested = new URL(request.url).searchParams.get('experts');
    const stored = db.get().adminAvailability[project.id];
    const expertIds = requested ? requested.split(',').filter(Boolean) : (stored?.expertIds ?? []);
    const askedAt =
      requested && stored?.expertIds.join(',') !== expertIds.join(',')
        ? new Date().toISOString()
        : (stored?.askedAt ?? new Date().toISOString());
    const sentToClientAt =
      stored && stored.expertIds.join(',') === expertIds.join(',') ? stored.sentToClientAt : null;
    db.update((draft) => {
      draft.adminAvailability[project.id] = { expertIds, askedAt, sentToClientAt };
    });
    const pool = searchPool(project);
    const experts = expertIds.flatMap((id) => pool.filter((expert) => expert.id === id));
    return HttpResponse.json(buildAvailability(project, experts, askedAt, sentToClientAt));
  }),

  // Screen 09 actions: nudge, resend the compliance form, message an expert, send to the client.
  // Everything goes to the email sandbox; nothing leaves the browser.
  http.post('/api/admin/projects/:id/availability', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = availabilityActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        400,
        'invalid',
        parsed.error.issues[0]?.message ?? 'Check and try again.',
      );
    }
    const now = new Date().toISOString();
    const mail = (to: string, subject: string, body: string) => ({
      id: createId('mail'),
      projectId: project.id,
      to,
      subject,
      body,
      sentAt: now,
    });
    const action = parsed.data;
    let count = 0;
    const sentToClientAt: string | null =
      db.get().adminAvailability[project.id]?.sentToClientAt ?? null;
    db.update((draft) => {
      if (action.action === 'nudge') {
        count = action.expertIds.length;
        for (const id of action.expertIds) {
          draft.adminMail.push(
            mail(
              id,
              `Reminder: confirm your call times for ${project.id}`,
              'Please confirm the times that work for you.',
            ),
          );
        }
      } else if (action.action === 'resend_compliance') {
        count = 1;
        draft.adminMail.push(
          mail(
            action.expertId,
            `Compliance form for ${project.id}`,
            'Please sign the compliance form before the call.',
          ),
        );
      } else if (action.action === 'message') {
        count = 1;
        draft.adminMail.push(mail(action.expertId, `About ${project.id}`, action.text));
      } else {
        // Prepare the client email (screen 10). Nothing is sent until the PM presses send there.
        count = action.experts.length;
        const pool = searchPool(project);
        const stored = draft.adminAvailability[project.id];
        const offered = buildAvailability(
          project,
          (stored?.expertIds ?? []).flatMap((id) => pool.filter((e) => e.id === id)),
          stored?.askedAt ?? now,
          null,
        );
        const chosen = action.experts.flatMap(({ expertId, slotIds }) => {
          const expert = pool.find((e) => e.id === expertId);
          const row = offered.experts.find((e) => e.expertId === expertId);
          return expert && row
            ? [{ expert, slots: row.slots.filter((slot) => slotIds.includes(slot.id)) }]
            : [];
        });
        draft.adminClientDraft[project.id] = buildClientDraft(
          project,
          chosen,
          pool.length,
          action.holdSlots,
          new Date(now),
        );
      }
    });
    return HttpResponse.json({ ok: true, count, sentToClientAt });
  }),

  // Screen 10: the drafted client email. 404 until screen 09 prepares one.
  http.get('/api/admin/projects/:id/client-draft', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const draft = db.get().adminClientDraft[project.id];
    if (!draft) return errorResponse(404, 'not_found', 'No experts are ready to send yet.');
    // Drafts saved before experts had names get them filled in.
    return HttpResponse.json({
      ...draft,
      experts: draft.experts.map((e) => ({ ...expertPerson(e.expertId), ...e })),
    });
  }),

  // Saves the draft, or sends it to the client (email sandbox).
  http.post('/api/admin/projects/:id/client-draft', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const current = db.get().adminClientDraft[project.id];
    if (!current) return errorResponse(404, 'not_found', 'No experts are ready to send yet.');
    const parsed = clientDraftInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', parsed.error.issues[0]?.message ?? 'Check the email.');
    }
    const { action, subject, intro, expertIds, settings } = parsed.data;
    const now = new Date().toISOString();
    const next = {
      ...current,
      subject,
      intro,
      settings,
      experts: current.experts
        .filter((e) => expertIds.includes(e.expertId))
        .map((e) => ({ ...expertPerson(e.expertId), ...e })),
      savedAt: action === 'save' ? now : current.savedAt,
      sentAt: action === 'send' ? now : current.sentAt,
    };
    db.update((draft) => {
      draft.adminClientDraft[project.id] = next;
      if (action === 'send') {
        draft.adminMail.push({
          id: createId('mail'),
          projectId: project.id,
          to: current.to.email,
          subject,
          body: intro,
          sentAt: now,
        });
        const availability = draft.adminAvailability[project.id];
        if (availability) availability.sentToClientAt = now;
        // Scripted: the client replies with their picks, and the reply lands in the inbox.
        const booking = buildBooking(project, next, new Date());
        draft.adminBooking[project.id] = booking;
        draft.adminInbox[booking.reply.inboxId] = replyInboxRequest(project, booking);
      }
    });
    return HttpResponse.json(next);
  }),

  // Screen 14: the live call workspace. The session is created the first time it is opened.
  http.get('/api/admin/projects/:id/call', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const booking = db.get().adminBooking[project.id];
    if (booking?.stage !== 'booked') {
      return errorResponse(404, 'not_found', 'No call is booked on this project yet.');
    }
    let session = db.get().adminCall[project.id];
    if (!session) {
      const created = buildCallSession(booking);
      db.update((draft) => {
        draft.adminCall[project.id] = created;
      });
      session = created;
    }
    return HttpResponse.json(session);
  }),

  http.post('/api/admin/projects/:id/call', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const current = db.get().adminCall[project.id];
    if (!current) return errorResponse(404, 'not_found', 'No call is booked on this project yet.');
    const parsed = callActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', parsed.error.issues[0]?.message ?? 'Check the request.');
    }
    const action = parsed.data;
    const iso = new Date().toISOString();
    const next = structuredClone(current);
    const mail: { to: string; subject: string; body: string }[] = [];

    if (action.action === 'resolve') {
      const target = next.requests.find((r) => r.id === action.requestId);
      if (!target) return errorResponse(404, 'not_found', 'That request is gone.');
      target.status = action.status;
      // Dropping a question changes the locked scope, so the project file moves to v1.1.
      if (target.kind === 'remove_requirement') {
        next.version = action.status === 'accepted' ? 'v1.1' : current.version;
      }
    } else if (action.action === 'note') {
      next.notes.push({ id: createId('note'), at: action.at, text: action.text });
    } else if (action.action === 'end') {
      next.endedAt = iso;
      next.duration = action.duration;
    } else {
      if (!next.endedAt) return errorResponse(409, 'live', 'End the call first.');
      if (action.action === 'send_all') {
        next.sentToClientAt = iso;
        mail.push({
          to: project.contact.email,
          subject: `Your call with Expert ${next.expert.letter}: summary and documents`,
          body: 'Call summary, full transcript, expert bio and the updated project file are attached.',
        });
      } else {
        next.expertPaidAt = iso;
      }
    }

    db.update((draft) => {
      draft.adminCall[project.id] = next;
      for (const m of mail) {
        draft.adminMail.push({ id: createId('mail'), projectId: project.id, sentAt: iso, ...m });
      }
    });
    return HttpResponse.json(next);
  }),

  // Screens 11–13: the client's picks, the sync with the experts and the booked calls.
  http.get('/api/admin/projects/:id/booking', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    let booking = db.get().adminBooking[project.id];
    // The email went out but its booking is missing (saved by an older build): the client's
    // scripted reply is rebuilt from the sent email, and the inbox reply is kept as it is.
    const sent = db.get().adminClientDraft[project.id];
    if (!booking && sent?.sentAt) {
      const rebuilt = buildBooking(project, sent, new Date(sent.sentAt));
      db.update((draft) => {
        draft.adminBooking[project.id] = rebuilt;
        draft.adminInbox[rebuilt.reply.inboxId] ??= replyInboxRequest(project, rebuilt);
      });
      booking = rebuilt;
    }
    if (!booking) return errorResponse(404, 'not_found', 'The client hasn’t replied yet.');
    return HttpResponse.json(booking);
  }),

  http.post('/api/admin/projects/:id/booking', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const current = db.get().adminBooking[project.id];
    if (!current) return errorResponse(404, 'not_found', 'The client hasn’t replied yet.');
    const parsed = bookingActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', parsed.error.issues[0]?.message ?? 'Check the message.');
    }
    const action = parsed.data;
    const now = new Date();
    const iso = now.toISOString();
    const next = structuredClone(current);
    const mail: { to: string; subject: string; body: string }[] = [];

    if (action.action === 'sync') {
      // The AI messages each picked expert; in the prototype they confirm straight away.
      next.stage = 'synced';
      next.syncedAt = iso;
      next.picks = next.picks.map((p) => ({ ...p, confirmedAt: iso }));
      next.notPicked = next.notPicked.map((e) => ({
        ...e,
        standby: action.standbyIds.includes(e.expertId),
      }));
      for (const pick of next.picks) {
        mail.push({
          to: pick.name,
          subject: `Please confirm your call on ${pick.slot.startsAt.slice(0, 10)}`,
          body: `${current.client.company} picked you for a 60-minute call.${pick.note ? ` They asked you to cover ${pick.note}.` : ''}`,
        });
      }
    } else if (action.action === 'unlock') {
      next.stage = 'synced';
      next.bookedAt = null;
      next.checklist = [];
    } else {
      const { subject, intro, closing, attachInvites, revealNames } = action.message;
      next.message = { ...next.message, subject, intro, closing, attachInvites, revealNames };
      if (action.action === 'save_message') {
        next.messageSavedAt = iso;
      } else {
        if (next.stage === 'picked') {
          return errorResponse(409, 'not_synced', 'Sync with the experts first.');
        }
        next.stage = 'booked';
        next.bookedAt = iso;
        next.version = 'v1.0';
        next.checklist = buildChecklist(next, now);
        mail.push({ to: current.client.email, subject, body: `${intro}\n\n${closing}` });
      }
    }

    db.update((draft) => {
      draft.adminBooking[project.id] = next;
      for (const m of mail) {
        draft.adminMail.push({ id: createId('mail'), projectId: project.id, sentAt: iso, ...m });
      }
      const reply = draft.adminInbox[current.reply.inboxId];
      if (reply && action.action === 'sync') {
        reply.steps = reply.steps.map((s) => (s.done ? s : { ...s, done: true, at: iso }));
      }
    });
    return HttpResponse.json(next);
  }),

  // Reminds the experts who haven't finished (sandbox mail; nothing leaves the browser).
  http.post('/api/admin/projects/:id/responses/nudge', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const sentIds = db.get().adminScreening[project.id] ?? [];
    const pool = searchPool(project);
    const sent = sentIds.flatMap((id) => pool.filter((expert) => expert.id === id));
    const waiting = buildResponses(project, sent, null, new Date()).responses.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_opened',
    );
    const now = new Date().toISOString();
    db.update((draft) => {
      for (const expert of waiting) {
        draft.adminMail.push({
          id: createId('mail'),
          projectId: project.id,
          to: expert.label,
          subject: `Reminder: screening questions for ${project.id}`,
          body: `Hi, a quick reminder to answer the ${project.questions.length} screening questions for ${project.name}.`,
          sentAt: now,
        });
      }
    });
    return HttpResponse.json({ nudged: waiting.length });
  }),

  http.get('/api/admin/summary', async () => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const now = new Date();
    const { adminInbox, adminProjects } = db.get();
    const empty = getControls().emptyData;
    const projects = empty ? [] : Object.values(adminProjects);
    const draft = projects
      .filter((p) => p.status === 'draft')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const summary: HomeSummary = {
      emailsToday: empty
        ? 0
        : Object.values(adminInbox).filter((r) => isToday(r.receivedAt, now)).length,
      expertsPendingReview: projects.reduce((sum, p) => sum + p.pendingExpertReviews, 0),
      newProjectsToday: projects.filter((p) => isToday(p.createdAt, now)).length,
      tip: draft ? draftTip(draft) : null,
    };
    return HttpResponse.json(summary);
  }),

  http.get('/api/admin/inbox', async () => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    if (getControls().emptyData) return HttpResponse.json([]);
    const requests = Object.values(db.get().adminInbox)
      // Emails saved before read state existed count as read.
      .map((r) => ({ ...r, read: r.read ?? true }))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return HttpResponse.json(requests);
  }),

  // The mailboxes the AI watches, and connecting another one (no real OAuth in the prototype).
  http.get('/api/admin/inbox/accounts', async () => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    return HttpResponse.json(db.get().adminMailAccounts);
  }),

  http.post('/api/admin/inbox/accounts', async ({ request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const parsed = addMailAccountInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', parsed.error.issues[0]?.message ?? 'Check the address.');
    }
    const address = parsed.data.address.toLowerCase();
    if (db.get().adminMailAccounts.some((a) => a.address === address)) {
      return errorResponse(409, 'duplicate', `${address} is already connected.`);
    }
    const account = {
      address,
      provider: parsed.data.provider,
      connectedAt: new Date().toISOString(),
    };
    db.update((draft) => {
      draft.adminMailAccounts.push(account);
    });
    return HttpResponse.json(account);
  }),

  // Opening an email marks it read; the toolbar can mark it unread again.
  http.post('/api/admin/inbox/:id/read', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const id = String(params.id);
    if (!db.get().adminInbox[id]) return errorResponse(404, 'not_found', 'That email is gone.');
    const body = (await request.json().catch(() => ({}))) as { read?: unknown };
    const read = body.read !== false;
    db.update((draft) => {
      const email = draft.adminInbox[id];
      if (email) email.read = read;
    });
    return HttpResponse.json({ ...db.get().adminInbox[id], read });
  }),

  http.get('/api/admin/projects', async () => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    if (getControls().emptyData) return HttpResponse.json([]);
    const projects = Object.values(db.get().adminProjects)
      .sort((a, b) => b.id.localeCompare(a.id))
      .map(toSummary);
    return HttpResponse.json(projects);
  }),

  http.get('/api/admin/projects/:id', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    return project ? HttpResponse.json(project) : notFound();
  }),

  http.patch('/api/admin/projects/:id', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = projectPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Check the highlighted fields and try again.');
    }
    const patch = parsed.data;
    const what = patch.questions
      ? 'the client questions'
      : patch.requirements
        ? 'the expert profile'
        : 'the project brief';
    return save(withActivity({ ...project, ...patch }, 'pm', `You edited ${what}`, new Date()));
  }),

  http.post('/api/admin/projects/:id/reset', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const { part } = (await request.json()) as { part: 'brief' | 'requirements' | 'questions' };
    if (!['brief', 'requirements', 'questions'].includes(part)) {
      return errorResponse(400, 'invalid', 'Choose what to reset.');
    }
    const label = { brief: 'brief', requirements: 'expert profile', questions: 'client questions' };
    return save(
      withActivity(
        { ...project, [part]: project.ai[part] },
        'pm',
        `You reset the ${label[part]} to the AI draft`,
        new Date(),
      ),
    );
  }),

  http.post('/api/admin/projects/:id/brief/regenerate', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const { length } = (await request.json()) as { length: 'standard' | 'shorter' };
    const variants: readonly string[] =
      project.id === 'PRJ-1042' ? PRJ_1042_BRIEFS[length] : [project.ai.brief];
    const index = variants.indexOf(project.ai.brief);
    const brief = variants[(index + 1) % variants.length] ?? project.ai.brief;
    return save(
      withActivity(
        { ...project, brief, briefLength: length, ai: { ...project.ai, brief } },
        'ai',
        length === 'shorter' ? 'AI wrote a shorter brief' : 'AI regenerated the brief',
        new Date(),
      ),
    );
  }),

  http.post('/api/admin/projects/:id/confirmations', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const { confirmationId } = (await request.json()) as { confirmationId: string };
    const confirmation = project.confirmations.find((c) => c.id === confirmationId);
    if (!confirmation?.proposal) {
      return errorResponse(400, 'invalid', 'This one needs the client’s answer. Ask the client.');
    }
    const facts = project.facts.map((f) =>
      f.id === confirmation.factId
        ? { ...f, value: confirmation.proposal, state: 'ok' as const }
        : f,
    );
    const confirmations = project.confirmations.map((c) =>
      c.id === confirmationId ? { ...c, state: 'confirmed' as const } : c,
    );
    const fact = project.facts.find((f) => f.id === confirmation.factId);
    return save(
      withActivity(
        { ...project, facts, confirmations },
        'pm',
        `You confirmed ${fact?.label.toLowerCase() ?? 'a fact'}: ${confirmation.proposal}`,
        new Date(),
      ),
    );
  }),

  http.get('/api/admin/projects/:id/clarification', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    return project ? HttpResponse.json(clarificationDraft(project)) : notFound();
  }),

  http.post('/api/admin/projects/:id/clarification', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = clarificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Add a subject and a message before sending.');
    }
    const now = new Date();
    db.update((draft) => {
      draft.adminMail.unshift({
        id: createId('mail'),
        projectId: project.id,
        ...parsed.data,
        sentAt: now.toISOString(),
      });
    });
    const confirmations = project.confirmations.map((c) =>
      c.state === 'open' ? { ...c, state: 'asked' as const } : c,
    );
    return save(
      withActivity(
        { ...project, confirmations },
        'pm',
        `You sent a clarification email to ${project.contact.name}`,
        now,
      ),
    );
  }),

  http.post('/api/admin/projects/:id/approve', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    if (project.status !== 'draft' && project.status !== 'needs_client_info') {
      return errorResponse(409, 'conflict', 'This project file is already approved.');
    }
    const now = new Date();
    const approved = withActivity(
      withActivity(
        { ...project, status: 'matching', approvedAt: now.toISOString() },
        'pm',
        'You approved the project file',
        now,
      ),
      'ai',
      'AI started matching experts',
      now,
    );
    const requestId = project.source.requestId;
    const matches = ensureMatches(approved, now);
    db.update((draft) => {
      draft.adminMatches[approved.id] = matches;
      const inbox = requestId ? draft.adminInbox[requestId] : undefined;
      if (inbox) {
        inbox.status = 'converted';
        inbox.steps = inbox.steps.map((s) =>
          s.done ? s : { ...s, done: true, at: now.toISOString(), label: `Approved by ${PM_NAME}` },
        );
      }
    });
    return save(approved);
  }),

  http.get('/api/admin/projects/:id/matches', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    if (project.status === 'draft' || project.status === 'needs_client_info') {
      return errorResponse(409, 'conflict', 'Approve the project file before matching experts.');
    }
    if (getControls().emptyData) {
      return HttpResponse.json(emptyMatches(project.id, new Date()));
    }
    const now = new Date();
    const existing = db.get().adminMatches[project.id];
    if (existing) return HttpResponse.json(matchResultSchema.parse(existing));
    const matches = ensureMatches(project, now);
    db.update((draft) => {
      draft.adminMatches[project.id] = matches;
    });
    return HttpResponse.json(matches);
  }),

  http.patch('/api/admin/projects/:id/matches', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = matchPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Choose an expert to pin or exclude.');
    }
    const matches = db.get().adminMatches[project.id] ?? ensureMatches(project, new Date());
    const experts = matches.experts.map((expert) => {
      if (expert.id !== parsed.data.expertId) return expert;
      return {
        ...expert,
        pinned: parsed.data.pinned ?? expert.pinned,
        excluded: parsed.data.excluded ?? expert.excluded,
      };
    });
    const next: MatchResult = { ...matches, experts };
    db.update((draft) => {
      draft.adminMatches[project.id] = next;
    });
    return HttpResponse.json(next);
  }),

  http.get('/api/admin/projects/:id/shortlist', async ({ params }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const shortlist = db.get().adminShortlists[project.id];
    if (!shortlist) {
      return errorResponse(
        404,
        'not_found',
        'No shortlist yet. Generate one from the matched experts.',
      );
    }
    return HttpResponse.json(shortlistSchema.parse(shortlist));
  }),

  http.post('/api/admin/projects/:id/shortlist', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const parsed = generateShortlistInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Choose Top 10, Top 20 or Top 30.');
    }
    const now = new Date();
    const matches = db.get().adminMatches[project.id] ?? ensureMatches(project, now);
    const shortlist = buildShortlist(project, matches, parsed.data.size, now);
    const updated = withActivity(
      { ...project, status: 'shortlisted' },
      'ai',
      `AI shortlisted the top ${parsed.data.size} experts`,
      now,
    );
    db.update((draft) => {
      draft.adminMatches[project.id] = matches;
      draft.adminShortlists[project.id] = shortlist;
      draft.adminProjects[project.id] = updated;
    });
    return HttpResponse.json(shortlist);
  }),

  http.patch('/api/admin/projects/:id/shortlist', async ({ params, request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const project = findProject(params.id);
    if (!project) return notFound();
    const shortlist = db.get().adminShortlists[project.id];
    if (!shortlist) {
      return errorResponse(404, 'not_found', 'Generate a shortlist first.');
    }
    const parsed = shortlistPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'invalid', 'Choose what to change on the shortlist.');
    }
    const matches = db.get().adminMatches[project.id] ?? ensureMatches(project, new Date());
    let next = shortlist;
    if (parsed.data.selectedIds) {
      const selected = new Set(parsed.data.selectedIds);
      next = {
        ...shortlist,
        experts: shortlist.experts.map((e) => ({ ...e, selected: selected.has(e.id) })),
      };
    }
    if (parsed.data.removeId || parsed.data.swapId) {
      next = swapOrRemove(next, matches, project, parsed.data, new Date());
    }
    db.update((draft) => {
      draft.adminShortlists[project.id] = next;
    });
    return HttpResponse.json(next);
  }),

  http.post('/api/admin/assistant', async ({ request }) => {
    const auth = await guard();
    if ('response' in auth) return auth.response;
    const parsed = assistantInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(400, 'invalid', 'Type a question first.');
    return HttpResponse.json(assistantReply(parsed.data.text, db.get()));
  }),
];

function ensureMatches(project: Project, now: Date): MatchResult {
  if (project.id === 'PRJ-1042') return seedPrj1042Matches(now);
  return emptyMatches(project.id, now);
}
