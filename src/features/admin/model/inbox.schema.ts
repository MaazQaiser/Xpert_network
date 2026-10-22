import { z } from 'zod';

/** Where an incoming client email is in the AI's pipeline (PRD screen 02). */
export const inboxStatusSchema = z.enum([
  'brief_ready',
  'reading',
  'extracting',
  'needs_client_info',
  'cant_open',
  'converted',
]);
export type InboxStatus = z.infer<typeof inboxStatusSchema>;

export const attachmentSchema = z.object({
  name: z.string(),
  kind: z.enum(['pdf', 'docx', 'xlsx']),
  pages: z.number().int().positive().nullable(),
  size: z.string(),
  /** What the AI found when it opened the file, e.g. "text layer found". */
  note: z.string().nullable(),
  /** Reading progress while the AI is still working, 0–100. */
  progress: z.number().int().min(0).max(100).nullable(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const pipelineStepSchema = z.object({
  label: z.string(),
  done: z.boolean(),
  at: z.string().nullable(),
});
export type PipelineStep = z.infer<typeof pipelineStepSchema>;

export const inboxRequestSchema = z.object({
  id: z.string(),
  from: z.object({ name: z.string(), email: z.string() }),
  company: z.string(),
  /** The address the email was sent to (the connected inbox). */
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  status: inboxStatusSchema,
  attachment: attachmentSchema.nullable(),
  steps: z.array(pipelineStepSchema),
  /** Facts the AI couldn't settle from the email or document. */
  confirmations: z.array(z.string()),
  /** The email the AI sent back when something was missing, shown read-only. */
  autoReply: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type InboxRequest = z.infer<typeof inboxRequestSchema>;

export const INBOX_VIEWS = ['all', 'review', 'processing', 'client_info', 'converted'] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const INBOX_VIEW_LABELS: Record<InboxView, string> = {
  all: 'All',
  review: 'Needs your review',
  processing: 'AI processing',
  client_info: 'Needs client info',
  converted: 'Converted to project',
};

const VIEW_STATUSES: Record<Exclude<InboxView, 'all'>, InboxStatus[]> = {
  review: ['brief_ready'],
  processing: ['reading', 'extracting'],
  client_info: ['needs_client_info', 'cant_open'],
  converted: ['converted'],
};

export function inView(request: Pick<InboxRequest, 'status'>, view: InboxView): boolean {
  return view === 'all' || VIEW_STATUSES[view].includes(request.status);
}

export function parseInboxView(value: string | null): InboxView {
  return INBOX_VIEWS.find((view) => view === value) ?? 'all';
}

export function matchesSearch(request: InboxRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    request.from.name,
    request.company,
    request.subject,
    request.body,
    request.attachment?.name,
  ].some((field) => field?.toLowerCase().includes(q));
}
