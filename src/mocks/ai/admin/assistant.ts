import type {
  AssistantReply,
  ChatBlock,
  ChatChip,
  ChatEmail,
  InboxRequest,
  Project,
} from '@/features/admin';
import { CARD_PROMPTS, PROJECT_STATUS_LABELS, SUGGESTED_PROMPTS } from '@/features/admin';
import { createId } from '@/shared/lib/id';
import { seedTeam } from '../../fixtures/admin/directory';
import type { DemoState } from '../../store/db';

const DAY_MS = 24 * 60 * 60 * 1000;
const within24h = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime() < DAY_MS;

/** How much an email needs the PM, for "the most important emails today". */
const PRIORITY: Record<InboxRequest['status'], number> = {
  client_reply: 5,
  brief_ready: 4,
  cant_open: 3,
  needs_client_info: 2,
  reading: 1,
  extracting: 1,
  converted: 0,
};

function reasonFor(email: InboxRequest): string {
  switch (email.status) {
    case 'client_reply':
      return 'The client replied with their picks';
    case 'brief_ready':
      return email.confirmations.length > 0
        ? `Brief drafted · ${email.confirmations.length} ${email.confirmations.length === 1 ? 'thing' : 'things'} to confirm`
        : 'Brief drafted and ready to review';
    case 'cant_open':
      return 'The attachment is password-protected';
    case 'needs_client_info':
      return 'No brief yet · I asked the client for one';
    case 'converted':
      return `Already converted to ${email.projectId}`;
    default:
      return 'I’m still reading the attachment';
  }
}

/** The email as a card in the chat; picking it asks for a summary and next steps. */
function toChatEmail(email: InboxRequest): ChatEmail {
  return {
    requestId: email.id,
    from: email.from,
    company: email.company,
    subject: email.subject,
    receivedAt: email.receivedAt,
    attachment: email.attachment?.name ?? null,
    reason: reasonFor(email),
    projectId: email.projectId,
    prompt: `Tell me about the email from ${email.from.name}`,
    action: 'Summarise it',
  };
}

/** An expert who was sent a project's screening questions. */
export type ScreenedExpert = { projectId: string; expertId: string; name: string };

/** Enough of a team member for the progress report. */
type RosterMember = {
  id: string;
  name: string;
  openProjects: number;
  bookedProjects: number;
  avgHoursToBrief: number | null;
  active: boolean;
};

/** Same projects the Home "Active projects" card counts. */
function isActiveProject(project: Project): boolean {
  return (
    (project.status === 'matching' || project.status === 'pitching') && project.id !== 'PRJ-1039'
  );
}

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const firstName = (name: string) => name.split(' ')[0] ?? name;

/**
 * Scripted Home assistant (PRD screen 01). Answers from the mock store by keyword so the numbers
 * always match what the PM sees elsewhere. The three summary cards start the main flows: today's
 * new projects → pick one → its brief on an editable canvas; today's most important emails → pick
 * one → a summary and next steps; experts waiting for review → their screening answers.
 */
export function assistantReply(
  text: string,
  state: Pick<DemoState, 'adminInbox' | 'adminProjects'> & {
    adminBooking?: DemoState['adminBooking'];
  },
  now = new Date(),
  /** The PM's first name, so the assistant can speak to them. */
  pmName?: string,
  /** Experts sent screening questions, so the PM can ask for one by name. */
  screened: ScreenedExpert[] = [],
  /** Team roster. Empty when the prototype toolbar is showing no data. */
  team: RosterMember[] = Object.values(seedTeam()),
): AssistantReply {
  const q = text.toLowerCase();
  const projects = Object.values(state.adminProjects);
  const inbox = Object.values(state.adminInbox);
  const reply = (
    body: string,
    basis: string,
    extra: { blocks?: ChatBlock[]; chips?: ChatChip[]; links?: AssistantReply['links'] } = {},
  ): AssistantReply => ({
    id: createId('ans'),
    text: body,
    links: extra.links ?? [],
    basis,
    blocks: extra.blocks ?? [],
    chips: extra.chips ?? [],
  });
  const ask = (label: string, prompt: string): ChatChip => ({ label, prompt, href: null });
  const go = (label: string, href: string): ChatChip => ({ label, prompt: null, href });

  // ——— A project created from its brief: confirm it, then offer the next step ——————————
  // A project named by its ID or, as the chat now asks, by its name.
  const named = projects.find(
    (p) => q.includes(p.id.toLowerCase()) || q.includes(p.name.toLowerCase()),
  );
  if (named && q.includes('create the project')) {
    return reply('', `${named.id} project file`, {
      blocks: [{ kind: 'requirements', projectId: named.id }],
    });
  }

  // ——— Find experts for a project: the search runs in the chat ———————————————————————
  if (named && q.includes('find experts')) {
    return reply(
      `Searching the [[!system’s expert listing]] for **${named.name}**.`,
      `${named.id} brief, expert profile and screening questions`,
      { blocks: [{ kind: 'expertSearch', projectId: named.id }] },
    );
  }

  // Profiles the PM picked, as one email to the client.
  if (named && q.includes('sharing these expert profiles')) {
    const client = firstName(named.contact.name);
    return reply(
      `Here’s the email to **${client}** for **${named.name}**. It has the profiles you picked. Send it when it looks right.`,
      `${named.id} client email`,
      { blocks: [{ kind: 'clientEmail', projectId: named.id }] },
    );
  }

  // ——— One expert's screening answers, asked for by name ————————————————————————————
  const expert = screened.find((e) => q.includes(e.name.toLowerCase()));
  if (expert && (q.includes('answer') || q.includes('screening'))) {
    const project = state.adminProjects[expert.projectId];
    return reply(
      `Let me pull up **${expert.name}**’s screening answers${project ? ` for **${project.name}**` : ''}.`,
      `${expert.projectId} screening answers`,
      {
        blocks: [
          {
            kind: 'screeningAnswers',
            projectId: expert.projectId,
            expertId: expert.expertId,
            expertName: expert.name,
          },
        ],
      },
    );
  }

  // ——— Screening answers, no project named: the one whose questions went out last ——————
  const asksForAnswers = q.includes('screening') || (q.includes('answer') && q.includes('expert'));
  if (!named && asksForAnswers) {
    const latest = screened[0] ? state.adminProjects[screened[0].projectId] : undefined;
    if (!latest) {
      return reply(
        'No screening questions have gone out yet. Find experts for a project, pick a few and send them the questions; I’ll show their answers here as they come in.',
        'Screening questions sent',
      );
    }
    return reply(
      `Here are the experts who have answered the screening questions so far for **${latest.name}**. Their details are below.`,
      `${latest.id} screening answers`,
      { blocks: [{ kind: 'screeningAnswers', projectId: latest.id }] },
    );
  }

  // ——— A project's screening answers: who answered, read in the chat ——————————————————
  if (named && q.includes('screening answer')) {
    return reply(
      `Let me check who answered the screening questions for **${named.name}**.`,
      `${named.id} screening answers`,
      { blocks: [{ kind: 'screeningAnswers', projectId: named.id }] },
    );
  }

  // ——— A project's brief, on the canvas ————————————————————————————————————————————
  if (named && (q.includes('brief') || q.includes('show') || q.includes('open'))) {
    return briefReply(named);
  }

  // ——— Today's new projects → which brief? —————————————————————————————————————————
  if (q.includes('new project') && !q.includes('summar')) {
    const fresh = projects
      .filter((p) => within24h(p.createdAt, now) && p.source.requestId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const emails = fresh
      .map((p) => (p.source.requestId ? state.adminInbox[p.source.requestId] : undefined))
      .filter((e): e is InboxRequest => e !== undefined && e.status === 'brief_ready')
      .map((e) => ({
        ...toChatEmail(e),
        prompt: `Give me the brief for ${(e.projectId && state.adminProjects[e.projectId]?.name) ?? e.projectId}`,
        action: 'Show brief',
        reason: `${e.projectId} · ${reasonFor(e)}`,
      }));
    if (emails.length === 0) {
      return reply('No new projects came in today yet.', 'Projects created in the last 24 hours');
    }
    return reply(
      emails.length === 1
        ? 'Here’s the [[1 new project]] that came in today. Should we move its brief forward?'
        : `Here are the [[${emails.length} new projects]] that came in today. Which project brief should we move forward?`,
      'Projects created in the last 24 hours',
      { blocks: [{ kind: 'emails', items: emails }] },
    );
  }

  // ——— Today's most important emails ——————————————————————————————————————————————
  if (q.includes('important') || q.includes('emails from today') || q.includes('emails today')) {
    const today = inbox.filter((e) => within24h(e.receivedAt, now));
    const top = [...today]
      .sort(
        (a, b) =>
          PRIORITY[b.status] + (b.read ? 0 : 0.5) - (PRIORITY[a.status] + (a.read ? 0 : 0.5)) ||
          b.receivedAt.localeCompare(a.receivedAt),
      )
      .slice(0, 3);
    if (top.length === 0) {
      return reply('No emails came in today.', 'Emails received in the last 24 hours');
    }
    return reply(
      `[[${today.length} ${today.length === 1 ? 'email' : 'emails'}]] came in today. ${top.length === 1 ? '[[!This one]] needs you most.' : `[[!These ${top.length}]] need you most.`} Which one do you want to look at?`,
      'Emails received in the last 24 hours, ranked by what needs you',
      {
        blocks: [{ kind: 'emails', items: top.map(toChatEmail) }],
        chips: [go('See all emails in the Inbox', '/admin/inbox')],
      },
    );
  }

  // ——— One email, summarised, with next steps —————————————————————————————————————
  const fromEmail = inbox.find(
    (e) => q.includes(`email from ${e.from.name.toLowerCase()}`) || q.includes(e.id.toLowerCase()),
  );
  if (fromEmail?.status === 'client_reply' && fromEmail.projectId) {
    const booking = state.adminBooking?.[fromEmail.projectId];
    const client = firstName(fromEmail.from.name);
    const count = booking?.picks.length ?? 2;
    if (booking?.stage === 'booked') {
      return reply(`The calls with **${client}** are booked.`, `${fromEmail.from.name}’s reply`, {
        chips: [go('View your calendar', '/admin/scheduling')],
      });
    }
    const people = count === 1 ? '1 expert' : `${count} experts`;
    return reply(
      `**${client}** picked ${people} and wants to connect. Should I book the meetings?`,
      `${fromEmail.from.name}’s reply`,
      { blocks: [{ kind: 'bookMeetings', projectId: fromEmail.projectId }] },
    );
  }
  if (fromEmail) {
    const file = fromEmail.attachment;
    const points = [
      { label: 'From', value: `${fromEmail.from.name}, ${fromEmail.company}` },
      { label: 'They asked', value: fromEmail.body },
      {
        label: 'Attachment',
        value: file
          ? [file.name, file.pages ? `${file.pages} pages` : null, file.note]
              .filter(Boolean)
              .join(' · ')
          : 'None',
      },
      { label: 'Where it stands', value: reasonFor(fromEmail) },
    ];
    const chips: ChatChip[] = [];
    if (fromEmail.projectId) {
      chips.push(
        ask(
          'Give me the project brief',
          `Give me the brief for ${state.adminProjects[fromEmail.projectId]?.name ?? fromEmail.projectId}`,
        ),
      );
    }
    if (fromEmail.status === 'needs_client_info' || fromEmail.status === 'cant_open') {
      chips.push(ask('Draft a reply', `Draft a reply to ${fromEmail.from.name}`));
    }
    chips.push(go('Open in Inbox', `/admin/inbox/${fromEmail.id}`));
    return reply(
      `Here’s **${firstName(fromEmail.from.name)}’s email** in short.`,
      `${fromEmail.from.name}’s email and its attachment`,
      {
        blocks: [
          {
            kind: 'emailSummary',
            email: toChatEmail(fromEmail),
            points,
            missing: fromEmail.confirmations,
          },
        ],
        chips,
      },
    );
  }

  // ——— A reply for one sender ——————————————————————————————————————————————————————
  const replyTo = inbox.find((e) => q.includes(`reply to ${e.from.name.toLowerCase()}`));
  if (replyTo) {
    const name = firstName(replyTo.from.name);
    const body =
      replyTo.status === 'cant_open' && replyTo.attachment
        ? `Hi ${name}, thanks for sending ${replyTo.attachment.name}. It’s password-protected, so we couldn’t open it. Could you send an unlocked copy, or share the password separately? Then we’ll get your experts lined up., Palto, Xpert Network`
        : (replyTo.autoReply ??
          `Hi ${name}, thanks for your email. Could you send your brief, the questions you want answered and when you need the calls? Thanks, Palto at Xpert Network`);
    return reply(
      `Here’s a reply for **${name}**. Check it, then send it from the Inbox.`,
      `${replyTo.from.name}’s email`,
      {
        blocks: [
          {
            kind: 'draftReply',
            to: `${replyTo.from.name} <${replyTo.from.email}>`,
            subject: `Re: ${replyTo.subject}`,
            body,
          },
        ],
        chips: [go('Open in Inbox', `/admin/inbox/${replyTo.id}`)],
      },
    );
  }

  // ——— Experts waiting for review ——————————————————————————————————————————————————
  if (q.includes('expert') && (q.includes('review') || q.includes('waiting'))) {
    const waiting = projects
      .filter((p) => p.pendingExpertReviews > 0)
      .sort((a, b) => b.pendingExpertReviews - a.pendingExpertReviews || b.id.localeCompare(a.id));
    if (waiting.length === 0) {
      return reply('No expert answers are waiting for you right now.', 'All projects');
    }
    const total = waiting.reduce((sum, p) => sum + p.pendingExpertReviews, 0);
    return reply(
      `[[!${total} expert ${total === 1 ? 'answer' : 'answers'}]] ${total === 1 ? 'is' : 'are'} waiting. Pick a project and I’ll open the answers.`,
      'Expert responses across all projects',
      {
        blocks: [
          {
            kind: 'experts',
            items: waiting.map((p) => ({
              projectId: p.id,
              projectName: p.name,
              client: p.client.name,
              count: p.pendingExpertReviews,
              href: `/admin/projects/${p.id}`,
              prompt: `Show the screening answers for ${p.name}`,
            })),
          },
        ],
        chips: [ask('Share today’s new project email details', CARD_PROMPTS.emails)],
      },
    );
  }

  if (q.includes('draft') || q.includes('missing') || q.includes('reply')) {
    const stuck = inbox.filter((r) => r.status === 'needs_client_info' || r.status === 'cant_open');
    if (stuck.length === 0) {
      return reply('Every email has what it needs. Nothing to reply to.', 'Projects inbox');
    }
    return reply(
      `[[!${stuck.length} ${stuck.length === 1 ? 'email' : 'emails'}]] ${stuck.length === 1 ? 'is' : 'are'} missing what I need to draft a brief. Pick one and I’ll draft the reply.`,
      'Emails marked “Needs client info” in the inbox',
      {
        blocks: [
          {
            kind: 'emails',
            items: stuck.map((e) => ({
              ...toChatEmail(e),
              prompt: `Draft a reply to ${e.from.name}`,
              action: 'Draft a reply',
            })),
          },
        ],
      },
    );
  }

  // ——— Progress of every project, not only the ones still in matching or pitching ———————
  if (q.includes('progress') && q.includes('project')) {
    const all = projects
      .filter((project) => project.status !== 'archived')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (all.length === 0) {
      return reply('There’s no project progress to share yet.', 'All projects');
    }
    return reply(
      `Here’s where all [[!${countLabel(all.length, 'project')}]] stand.`,
      'All projects',
      {
        blocks: [
          {
            kind: 'projects',
            items: all.map((p) => ({
              projectId: p.id,
              projectName: p.name,
              client: p.client.name,
              status: PROJECT_STATUS_LABELS[p.status],
              href: `/admin/projects/${p.id}`,
            })),
          },
        ],
        chips: [
          ask(SUGGESTED_PROMPTS[1], SUGGESTED_PROMPTS[1]),
          ask(SUGGESTED_PROMPTS[2], SUGGESTED_PROMPTS[2]),
        ],
      },
    );
  }

  // ——— Active projects, the same set as the Home card ———————————————————————————————
  if (q.includes('active') && q.includes('project')) {
    const active = projects
      .filter(isActiveProject)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (active.length === 0) {
      return reply('You have no active projects right now.', 'Projects in matching or pitching');
    }
    return reply(
      `You have [[!${countLabel(active.length, 'active project')}]]. ${
        active.length === 1 ? 'Here’s where it stands.' : 'Here’s where each one stands.'
      }`,
      'Projects in matching or pitching',
      {
        blocks: [
          {
            kind: 'projects',
            items: active.map((p) => ({
              projectId: p.id,
              projectName: p.name,
              client: p.client.name,
              status: PROJECT_STATUS_LABELS[p.status],
              href: `/admin/projects/${p.id}`,
            })),
          },
        ],
        chips: [
          ask(SUGGESTED_PROMPTS[1], SUGGESTED_PROMPTS[1]),
          ask(SUGGESTED_PROMPTS[2], SUGGESTED_PROMPTS[2]),
        ],
      },
    );
  }

  // ——— Team roster: who is carrying booked work, and who is inactive ————————————————
  if (q.includes('team')) {
    if (team.length === 0) {
      return reply('No one is on the team roster right now.', 'Team roster');
    }
    const activePeople = team.filter((member) => member.active);
    const leader = [...team].sort((a, b) => b.bookedProjects - a.bookedProjects)[0];
    const inactive = team.filter((member) => !member.active);
    const people = countLabel(activePeople.length, 'person', 'people');
    let text = `[[!${people}]] ${activePeople.length === 1 ? 'is' : 'are'} active on the team.`;
    const carrying =
      leader && leader.bookedProjects > 0 ? `**${leader.name}** is carrying the booked work` : null;
    const resting =
      inactive.length > 0
        ? `${inactive.map((member) => `**${member.name}**`).join(' and ')} ${
            inactive.length === 1 ? 'is' : 'are'
          } inactive`
        : null;
    if (carrying && resting) text += ` ${carrying}, and ${resting}.`;
    else if (carrying || resting) text += ` ${carrying ?? resting}.`;
    return reply(text, 'Team roster', {
      blocks: [
        {
          kind: 'team',
          items: team.map((member) => ({
            id: member.id,
            name: member.name,
            openProjects: member.openProjects,
            bookedProjects: member.bookedProjects,
            avgHoursToBrief: member.avgHoursToBrief,
            active: member.active,
          })),
        },
      ],
      chips: [
        ask(SUGGESTED_PROMPTS[0], SUGGESTED_PROMPTS[0]),
        ask(SUGGESTED_PROMPTS[2], SUGGESTED_PROMPTS[2]),
      ],
    });
  }

  // ——— The newest conversations in the inbox ———————————————————————————————————————
  if (q.includes('conversation')) {
    const recent = [...inbox].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 3);
    if (recent.length === 0) {
      return reply('No recent conversations in your inbox.', 'Inbox, newest first');
    }
    const lead = recent.length === 1 ? 'Here is the' : 'Here are the';
    return reply(
      `${lead} [[${countLabel(recent.length, 'most recent conversation')}]] in your inbox.`,
      'Inbox, newest first',
      {
        blocks: [{ kind: 'emails', items: recent.map(toChatEmail) }],
        chips: [go('See all emails in the Inbox', '/admin/inbox')],
      },
    );
  }

  // ——— Company progress: stages, reviews waiting, emails that cannot become a brief ———
  if (q.includes('company')) {
    const drafts = projects.filter((p) => p.status === 'draft').length;
    const inFlight = projects.filter(
      (p) => p.status === 'matching' || p.status === 'pitching',
    ).length;
    const reviews = projects.reduce((sum, p) => sum + p.pendingExpertReviews, 0);
    const stuck = inbox.filter(
      (r) => r.status === 'needs_client_info' || r.status === 'cant_open',
    ).length;
    if (projects.length === 0 && reviews === 0 && stuck === 0) {
      return reply('There’s no company progress to report yet.', 'All projects and the inbox');
    }
    return reply(
      `You have ${countLabel(projects.length, 'project')}: ${drafts} still in draft and ${inFlight} in matching or pitching. [[!${reviews} expert ${reviews === 1 ? 'answer' : 'answers'}]] ${reviews === 1 ? 'is' : 'are'} waiting for review, and ${countLabel(stuck, 'email')} cannot become a brief yet.`,
      'All projects and the inbox',
      {
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'Stage', value: `${drafts} draft, ${inFlight} matching or pitching` },
              { label: 'Reviews', value: `${reviews} waiting` },
              { label: 'Emails stuck', value: `${stuck} cannot become a brief yet` },
            ],
          },
        ],
        chips: [
          ask(SUGGESTED_PROMPTS[0], SUGGESTED_PROMPTS[0]),
          ask(SUGGESTED_PROMPTS[1], SUGGESTED_PROMPTS[1]),
        ],
      },
    );
  }

  if (q.includes('project') || q.includes('summar') || q.includes('today')) {
    const today = projects.filter((p) => within24h(p.createdAt, now));
    if (today.length === 0) {
      return reply('No new projects today yet.', 'Projects created today');
    }
    return reply(
      today
        .map(
          (p) =>
            `**${p.name}** for ${p.client.name}, ${PROJECT_STATUS_LABELS[p.status].toLowerCase()}${
              p.confirmations.some((c) => c.state === 'open')
                ? `, [[!${p.confirmations.filter((c) => c.state === 'open').length} things to confirm]]`
                : ''
            }.`,
        )
        .join(' '),
      'Projects created today',
      { chips: today.map((p) => ask(`Brief for ${p.name}`, `Give me the brief for ${p.name}`)) },
    );
  }

  if (named) return briefReply(named);

  return reply(
    'I can answer questions about your projects, team and recent conversations. Try one of the suggestions, or name a project like PRJ-1042.',
    'Projects inbox and project files',
  );

  function briefReply(project: Project): AssistantReply {
    return reply(
      `Here is the project brief for **${project.name}**.`,
      `${project.id} project file, drafted from ${project.source.fileName ?? 'the client’s email'}`,
      {
        blocks: [
          { kind: 'brief', projectId: project.id },
          { kind: 'createProject', projectId: project.id },
        ],
      },
    );
  }
}
