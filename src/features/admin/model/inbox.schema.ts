import { z } from 'zod';

/** Where an incoming client email is in the AI's pipeline (PRD screen 02). */
export const inboxStatusSchema = z.enum([
  'brief_ready',
  'reading',
  'extracting',
  'needs_client_info',
  'cant_open',
  'converted',
  // The client replied to an email we sent, e.g. with their expert picks (screen 11).
  'client_reply',
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
  /** Opened by the PM, as in any mail client. */
  read: z.boolean(),
});
export type InboxRequest = z.infer<typeof inboxRequestSchema>;

/** A mailbox the AI watches (screen 02 account switcher). */
export const mailProviderSchema = z.enum(['google', 'microsoft', 'imap']);
export type MailProvider = z.infer<typeof mailProviderSchema>;

export const MAIL_PROVIDER_LABELS: Record<MailProvider, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  imap: 'Other (IMAP)',
};

export const mailAccountSchema = z.object({
  address: z.string(),
  provider: mailProviderSchema,
  connectedAt: z.string(),
});
export type MailAccount = z.infer<typeof mailAccountSchema>;

export const addMailAccountInputSchema = z.object({
  provider: mailProviderSchema,
  address: z
    .string()
    .trim()
    .min(1, 'Enter the mailbox address.')
    .email('Enter a full email address, like team@company.com.'),
});
export type AddMailAccountInput = z.infer<typeof addMailAccountInputSchema>;

// The filters a mail client has; the AI's progress shows on each email's status tag instead.
export const INBOX_VIEWS = ['all', 'unread', 'attachments'] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const INBOX_VIEW_LABELS: Record<InboxView, string> = {
  all: 'All',
  unread: 'Unread',
  attachments: 'Attachments',
};

export function inView(
  request: Pick<InboxRequest, 'read' | 'attachment'>,
  view: InboxView,
): boolean {
  if (view === 'unread') return !request.read;
  if (view === 'attachments') return request.attachment !== null;
  return true;
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
