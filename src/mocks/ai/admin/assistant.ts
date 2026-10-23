import type {
  AssistantReply,
  ChatBlock,
  ChatChip,
  ChatEmail,
  InboxRequest,
  Project,
} from '@/features/admin';
import { CARD_PROMPTS, PROJECT_STATUS_LABELS } from '@/features/admin';
import { createId } from '@/shared/lib/id';
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

const firstName = (name: string) => name.split(' ')[0] ?? name;

/**
 * Scripted Home assistant (PRD screen 01). Answers from the mock store by keyword so the numbers
 * always match what the PM sees elsewhere. The three summary cards start the main flows: today's
 * new projects → pick one → its brief on an editable canvas; today's most important emails → pick
 * one → a summary and next steps; experts waiting for review → their screening answers.
 */
export function assistantReply(
  text: string,
  state: Pick<DemoState, 'adminInbox' | 'adminProjects'>,
  now = new Date(),
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

  // ——— A project's brief, on the canvas ————————————————————————————————————————————
  const named = projects.find((p) => q.includes(p.id.toLowerCase()));
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
      .filter((e): e is InboxRequest => e !== undefined)
      .map((e) => ({
        ...toChatEmail(e),
        prompt: `Give me the brief for ${e.projectId}`,
        action: 'Show the brief',
        reason: `${e.projectId} · ${reasonFor(e)}`,
      }));
    if (emails.length === 0) {
      return reply('No new projects came in today yet.', 'Projects created in the last 24 hours');
    }
    return reply(
      `${emails.length === 1 ? 'One new project' : `${emails.length} new projects`} came in today, each drafted from a client’s email. Which project brief do you need?`,
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
      `${today.length} ${today.length === 1 ? 'email' : 'emails'} came in today. ${top.length === 1 ? 'This one needs' : `These ${top.length} need`} you most. Which one do you want to look at?`,
      'Emails received in the last 24 hours, ranked by what needs you',
      {
        blocks: [{ kind: 'emails', items: top.map(toChatEmail) }],
        chips: [go('See all emails in the Inbox', '/admin/inbox')],
      },
    );
  }

  // ——— One email, summarised, with next steps —————————————————————————————————————
  const fromEmail = inbox.find(
    (e) => q.includes(`email from ${e.from.name.toLowerCase()}`) || q.includes(e.id),
  );
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
      chips.push(ask('Give me the project brief', `Give me the brief for ${fromEmail.projectId}`));
    }
    if (fromEmail.status === 'needs_client_info' || fromEmail.status === 'cant_open') {
      chips.push(ask('Draft a reply', `Draft a reply to ${fromEmail.from.name}`));
    }
    chips.push(go('Open in Inbox', `/admin/inbox/${fromEmail.id}`));
    return reply(
      `Here’s ${firstName(fromEmail.from.name)}’s email in short.`,
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
        ? `Hi ${name}, thanks for sending ${replyTo.attachment.name}. It’s password-protected, so we couldn’t open it. Could you send an unlocked copy, or share the password separately? Then we’ll get your experts lined up. — Palto, Xpert Network`
        : (replyTo.autoReply ??
          `Hi ${name}, thanks for your email. Could you send your brief, the questions you want answered and when you need the calls? — Palto, Xpert Network`);
    return reply(
      `Here’s a reply for ${name}. Check it, then send it from the Inbox.`,
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
    const waiting = projects.filter((p) => p.pendingExpertReviews > 0);
    if (waiting.length === 0) {
      return reply('No expert answers are waiting for you right now.', 'All projects');
    }
    const total = waiting.reduce((sum, p) => sum + p.pendingExpertReviews, 0);
    return reply(
      `${total} expert ${total === 1 ? 'answer is' : 'answers are'} waiting for your review. Open a project to read them.`,
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
            })),
          },
        ],
        chips: [ask('Show me today’s new projects', CARD_PROMPTS.projects)],
      },
    );
  }

  if (q.includes('draft') || q.includes('missing') || q.includes('reply')) {
    const stuck = inbox.filter((r) => r.status === 'needs_client_info' || r.status === 'cant_open');
    if (stuck.length === 0) {
      return reply('Every email has what it needs. Nothing to reply to.', 'Projects inbox');
    }
    return reply(
      `${stuck.length} ${stuck.length === 1 ? 'email is' : 'emails are'} missing what I need to draft a brief. Pick one and I’ll draft the reply.`,
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

  if (q.includes('project') || q.includes('summar') || q.includes('today')) {
    const today = projects.filter((p) => within24h(p.createdAt, now));
    if (today.length === 0) {
      return reply('No new projects today yet.', 'Projects created today');
    }
    return reply(
      today
        .map(
          (p) =>
            `${p.id}: ${p.name} for ${p.client.name}, ${PROJECT_STATUS_LABELS[p.status].toLowerCase()}${
              p.confirmations.some((c) => c.state === 'open')
                ? `, ${p.confirmations.filter((c) => c.state === 'open').length} things to confirm`
                : ''
            }.`,
        )
        .join(' '),
      'Projects created today',
      { chips: today.map((p) => ask(`Brief for ${p.id}`, `Give me the brief for ${p.id}`)) },
    );
  }

  if (named) return briefReply(named);

  return reply(
    'I can answer questions about your inbox, projects and experts. Try one of the suggestions, or name a project like PRJ-1042.',
    'Projects inbox and project files',
  );

  function briefReply(project: Project): AssistantReply {
    return reply(
      `Here’s the brief for ${project.id}, ${project.name}. Edit anything here; it saves to the project file.`,
      `${project.id} project file, drafted from ${project.source.fileName ?? 'the client’s email'}`,
      {
        blocks: [{ kind: 'brief', projectId: project.id }],
        chips: [ask('Show me today’s other new projects', CARD_PROMPTS.projects)],
      },
    );
  }
}
