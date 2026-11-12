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

/** A GetSales sender profile: one LinkedIn account the team sends outreach from. */
export const senderProfileSchema = z.object({
  uuid: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  label: z.string().nullable(),
  status: z.enum(['enabled', 'disabled']),
  linkedinConnected: z.boolean(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type SenderProfile = z.infer<typeof senderProfileSchema>;

export const createSenderProfileInputSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(255),
  lastName: z.string().trim().min(1, 'Enter a last name.').max(255),
  label: z.string().trim().max(255, 'Keep the label under 255 characters.'),
});
export type CreateSenderProfileInput = z.infer<typeof createSenderProfileInputSchema>;

/** One LinkedIn message in a GetSales conversation, sent by our sender or received from the lead. */
export const linkedinMessageSchema = z.object({
  uuid: z.string(),
  direction: z.enum(['sent', 'received']),
  text: z.string(),
  subject: z.string().nullable(),
  sentAt: z.string().nullable(),
  status: z.enum(['new', 'in_progress', 'done', 'failed']),
  linkedinType: z.enum(['connection_note', 'message', 'inmail']).nullable(),
  failReason: z.string().nullable(),
  read: z.boolean(),
});
export type LinkedinMessage = z.infer<typeof linkedinMessageSchema>;

/** A LinkedIn thread between one sender profile and one lead, messages oldest first. */
export const linkedinConversationSchema = z.object({
  id: z.string(),
  lead: z.object({
    uuid: z.string(),
    name: z.string(),
    headline: z.string().nullable(),
    company: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  lastMessageAt: z.string().nullable(),
  unread: z.number().int().nonnegative(),
  messages: z.array(linkedinMessageSchema),
});
export type LinkedinConversation = z.infer<typeof linkedinConversationSchema>;

/** A LinkedIn reply written in the inbox. GetSales accepts up to 8,000 characters. */
export const LINKEDIN_MESSAGE_MAX = 8000;
export const sendLinkedinMessageInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(LINKEDIN_MESSAGE_MAX, 'LinkedIn messages can be up to 8,000 characters.'),
});
export type SendLinkedinMessageInput = z.infer<typeof sendLinkedinMessageInputSchema>;

/** The newest message the lead sent, which opening the thread marks as read. */
export function latestReceivedAt(conversation: LinkedinConversation): string | null {
  const received = conversation.messages.filter((m) => m.direction === 'received' && m.sentAt);
  return received.at(-1)?.sentAt ?? null;
}

/** LinkedIn's limit for the note on a connection request. */
export const CONNECTION_NOTE_MAX = 300;

/** LinkedIn refused the message because the person isn't a 1st-degree connection. */
export function failedAsNonConnection(message: LinkedinMessage): boolean {
  return (
    message.status === 'failed' &&
    /NOT_FIRST_DEGREE|not a 1st-degree connection|not a connection/i.test(message.failReason ?? '')
  );
}

/** Search a conversation by the lead's name, headline, company or any message text. */
export function conversationMatches(conversation: LinkedinConversation, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { lead, messages } = conversation;
  return [lead.name, lead.headline, lead.company, ...messages.map((m) => m.text)].some((text) =>
    (text ?? '').toLowerCase().includes(q),
  );
}

/** In the inbox's account switcher, a sender is kept apart from mailbox addresses by this prefix. */
export const SENDER_ACCOUNT_PREFIX = 'sender:';
export const senderAccountId = (uuid: string) => `${SENDER_ACCOUNT_PREFIX}${uuid}`;
export const senderName = (profile: SenderProfile) =>
  `${profile.firstName} ${profile.lastName}`.trim();

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
