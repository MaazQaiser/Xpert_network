import { http, HttpResponse } from 'msw';
import {
  assistantInputSchema,
  clarificationSchema,
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

const isToday = (iso: string, now: Date) => new Date(iso).toDateString() === now.toDateString();

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
        return `${index + 1}. Budget: the brief doesn’t mention one. Is there a range per call or for the project?`;
      }
      return `${index + 1}. ${fact?.label ?? 'Detail'}: you mention ${fact?.value ?? 'this'}. ${
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

export const adminHandlers = [
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
    const requests = Object.values(db.get().adminInbox).sort((a, b) =>
      b.receivedAt.localeCompare(a.receivedAt),
    );
    return HttpResponse.json(requests);
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
