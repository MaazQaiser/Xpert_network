import type { AssistantReply } from '@/features/admin';
import { PROJECT_STATUS_LABELS } from '@/features/admin';
import { createId } from '@/shared/lib/id';
import type { DemoState } from '../../store/db';

/**
 * Scripted Home assistant (PRD screen 01). Answers from the mock store by keyword so the
 * numbers always match what the PM sees elsewhere.
 */
export function assistantReply(
  text: string,
  state: Pick<DemoState, 'adminInbox' | 'adminProjects'>,
  now = new Date(),
): AssistantReply {
  const q = text.toLowerCase();
  const projects = Object.values(state.adminProjects);
  const inbox = Object.values(state.adminInbox);
  const reply = (body: string, links: AssistantReply['links'], basis: string): AssistantReply => ({
    id: createId('ans'),
    text: body,
    links,
    basis,
  });

  if (q.includes('expert') && (q.includes('review') || q.includes('waiting'))) {
    const waiting = projects.filter((p) => p.pendingExpertReviews > 0);
    if (waiting.length === 0) {
      return reply('No expert answers are waiting for you right now.', [], 'All projects');
    }
    const total = waiting.reduce((sum, p) => sum + p.pendingExpertReviews, 0);
    const answers = (n: number) => `${n} expert ${n === 1 ? 'answer' : 'answers'}`;
    const [only] = waiting;
    const where =
      only && waiting.length === 1
        ? `all on ${only.id} (${only.name})`
        : waiting.map((p) => `${p.pendingExpertReviews} on ${p.id} (${p.name})`).join('; ');
    return reply(
      `${answers(total)} ${total === 1 ? 'is' : 'are'} waiting for your review, ${where}.`,
      waiting.map((p) => ({ label: `Open ${p.id}`, href: `/admin/projects/${p.id}` })),
      'Expert responses across all projects',
    );
  }

  if (q.includes('draft') || q.includes('missing') || q.includes('reply')) {
    const stuck = inbox.filter((r) => r.status === 'needs_client_info' || r.status === 'cant_open');
    if (stuck.length === 0) {
      return reply('Every email has what it needs. Nothing to reply to.', [], 'Projects inbox');
    }
    const lines = stuck.map((r) =>
      r.status === 'cant_open'
        ? `${r.from.name} (${r.company}) sent a password-protected file. Ask for an unlocked copy; we never try to open protected files.`
        : `${r.from.name} (${r.company}) sent no brief. I already replied asking for one and will file the answer to this thread.`,
    );
    return reply(
      lines.join(' '),
      stuck.map((r) => ({ label: `Open ${r.from.name}’s email`, href: `/admin/inbox/${r.id}` })),
      'Emails marked “Needs client info” in the projects inbox',
    );
  }

  if (q.includes('project') || q.includes('summar') || q.includes('today')) {
    const today = projects.filter(
      (p) => new Date(p.createdAt).toDateString() === now.toDateString(),
    );
    if (today.length === 0) {
      return reply('No new projects today yet.', [], 'Projects created today');
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
      today.map((p) => ({ label: `Open ${p.id}`, href: `/admin/projects/${p.id}/brief` })),
      'Projects created today',
    );
  }

  const mentioned = projects.find((p) => q.includes(p.id.toLowerCase()));
  if (mentioned) {
    return reply(
      `${mentioned.id} is ${PROJECT_STATUS_LABELS[mentioned.status].toLowerCase()}. ${mentioned.brief}`,
      [{ label: `Open ${mentioned.id}`, href: `/admin/projects/${mentioned.id}` }],
      `${mentioned.id} project file`,
    );
  }

  return reply(
    'I can answer questions about your inbox, projects and experts. Try one of the suggestions, or name a project like PRJ-1042.',
    [],
    'Projects inbox and project files',
  );
}
