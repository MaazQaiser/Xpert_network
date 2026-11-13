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
/** One day's LinkedIn hours: day 0 = Sunday … 6 = Saturday, minutes from midnight. */
export const senderTimeBlockSchema = z.object({
  dow: z.number().int().min(0).max(6),
  min: z.number().int().min(0).max(1439),
  max: z.number().int().min(1).max(1440),
});
export type SenderTimeBlock = z.infer<typeof senderTimeBlockSchema>;

/** When a sender's messages and connection requests may go out; the rest waits for the next window. */
export const senderScheduleSchema = z.object({
  timezone: z.string(),
  timeblocks: z.array(senderTimeBlockSchema),
});
export type SenderSchedule = z.infer<typeof senderScheduleSchema>;

export const senderProfileSchema = z.object({
  uuid: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  label: z.string().nullable(),
  status: z.enum(['enabled', 'disabled']),
  linkedinConnected: z.boolean(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
  linkedinSchedule: senderScheduleSchema.nullable().optional(),
  /** Whether the sender's LinkedIn session is working right now. */
  linkedinState: z
    .enum(['not_connected', 'ok', 'starting', 'stopped', 'login_issue', 'issue', 'unknown'])
    .optional(),
  /** Why it isn't working, as LinkedIn automation reported it. */
  linkedinIssue: z.string().nullable().optional(),
  /** Now is outside the sender's schedule; sending resumes then. Null while inside it. */
  outsideHoursUntil: z.string().nullable().optional(),
  /** It has a cloud browser behind a proxy, so connecting can go straight to signing in. */
  cloudBrowser: z.boolean().optional(),
});
export type SenderProfile = z.infer<typeof senderProfileSchema>;

/* ------------------------------ connecting LinkedIn ------------------------------ */

/** A country the sender's cloud browser can get a proxy in. */
export const proxyCountrySchema = z.object({ code: z.string(), name: z.string() });
export type ProxyCountry = z.infer<typeof proxyCountrySchema>;

export const cloudBrowserSchema = z.object({ url: z.string().url() });

/** Whether the account signed in to in the cloud browser has been picked up. */
export const linkedinSessionSchema = z.object({
  state: z.enum(['checking', 'connected', 'signed_out', 'failed']),
  issue: z.string().nullable(),
});
export type LinkedinSession = z.infer<typeof linkedinSessionSchema>;

export type SenderHealthTone = 'ok' | 'warning' | 'error' | 'off';
export interface SenderHealth {
  tone: SenderHealthTone;
  /** Short status for "LinkedIn · …". */
  text: string;
  /** A sentence on what's wrong, when something is (its own line). */
  detail: string | null;
  /** A short aside on the status line itself, after another "·". */
  note?: string;
}

/** "Fri 09:00", in the schedule's own time zone (the hours the user set). */
function resumeLabel(iso: string, timeZone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(new Date(iso));
  }
}

/** One status for the inbox: the first thing stopping this sender from sending, else Connected. */
export function senderHealth(profile: SenderProfile): SenderHealth {
  const state = profile.linkedinState ?? (profile.linkedinConnected ? 'ok' : 'not_connected');
  const issue = profile.linkedinIssue ?? null;
  if (state === 'not_connected') {
    return { tone: 'off', text: 'Not connected', detail: null };
  }
  if (profile.status !== 'enabled') {
    return {
      tone: 'warning',
      text: 'Paused',
      detail: 'This sender is switched off, so nothing goes out.',
    };
  }
  if (state === 'login_issue') {
    return {
      tone: 'error',
      text: 'Needs sign-in',
      detail: issue ?? 'LinkedIn signed this account out. Sign in again before sending.',
    };
  }
  if (state === 'issue') {
    return {
      tone: 'error',
      text: 'Not working',
      detail: issue ?? 'The LinkedIn session hit a problem. Messages wait until it’s fixed.',
    };
  }
  if (state === 'stopped') {
    return {
      tone: 'warning',
      text: 'Stopped',
      detail: 'Messages wait until the LinkedIn session runs again.',
    };
  }
  if (state === 'starting') return { tone: 'warning', text: 'Starting…', detail: null };
  if (profile.outsideHoursUntil) {
    return {
      tone: 'warning',
      text: `Sending paused until ${resumeLabel(profile.outsideHoursUntil, profile.linkedinSchedule?.timezone)}`,
      detail: null,
      note: 'Outside this sender’s hours',
    };
  }
  if (state === 'unknown') return { tone: 'off', text: 'Status unknown', detail: null };
  return { tone: 'ok', text: 'Connected', detail: null };
}

/** A day ends at 23:59: GetSales' app has no 24:00 (it shows 1440 minutes as 00:00). */
export const END_OF_DAY = 1439;
/** Monday first, the way the schedule reads. */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (dow: number) => DAY_NAMES[dow] ?? '';

/** 540 → "09:00", 1439 → "23:59". */
export function clockTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "09:00" → 540, "23:59" → 1439. */
export function minutesOf(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

export const isAllDayEveryDay = (schedule: SenderSchedule) =>
  WEEK_DAYS.every((dow) =>
    schedule.timeblocks.some((b) => b.dow === dow && b.min === 0 && b.max >= END_OF_DAY),
  );

/** "24 hours, every day", "Mon–Fri, 09:00–18:00", or "5 days a week, custom hours". */
export function scheduleSummary(schedule: SenderSchedule | null | undefined): string {
  if (!schedule || schedule.timeblocks.length === 0) return 'no hours set';
  if (isAllDayEveryDay(schedule)) return '24 hours, every day';
  const days = WEEK_DAYS.filter((dow) => schedule.timeblocks.some((b) => b.dow === dow));
  const [first] = schedule.timeblocks;
  const sameHours = schedule.timeblocks.every((b) => b.min === first?.min && b.max === first?.max);
  if (!first || !sameHours) return `${days.length} days a week, custom hours`;
  const hours =
    first.min === 0 && first.max >= END_OF_DAY
      ? '24 hours'
      : `${clockTime(first.min)}–${clockTime(first.max)}`;
  return `${dayRanges(days)}, ${hours}`;
}

/** [1,2,3,4,5] → "Mon–Fri"; [1,3] → "Mon, Wed". Works in WEEK_DAYS order. */
function dayRanges(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const order = days.map((d) => WEEK_DAYS.indexOf(d as (typeof WEEK_DAYS)[number]));
  const runs: number[][] = [];
  for (const i of order) {
    const run = runs.at(-1);
    if (run && run.at(-1) === i - 1) run.push(i);
    else runs.push([i]);
  }
  return runs
    .map((run) => {
      const names = run.map((i) => dayName(WEEK_DAYS[i] ?? 0));
      return run.length > 2 ? `${names[0]}–${names.at(-1)}` : names.join(', ');
    })
    .join(', ');
}

const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The schedule dialog: a time zone and a row per day (Monday first). */
export const senderScheduleFormSchema = z
  .object({
    timezone: z.string().min(1, 'Pick a time zone.'),
    days: z
      .array(
        z.object({
          dow: z.number().int().min(0).max(6),
          enabled: z.boolean(),
          start: z.string(),
          end: z.string(),
        }),
      )
      .length(7),
  })
  .superRefine((form, ctx) => {
    if (!form.days.some((d) => d.enabled)) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Turn on at least one day.' });
    }
    form.days.forEach((day, i) => {
      if (!day.enabled) return;
      for (const field of ['start', 'end'] as const) {
        if (!clockPattern.test(day[field])) {
          ctx.addIssue({
            code: 'custom',
            path: ['days', i, field],
            message: 'Use HH:MM, e.g. 09:00.',
          });
        }
      }
      if (clockPattern.test(day.start) && clockPattern.test(day.end)) {
        if (minutesOf(day.end) <= minutesOf(day.start)) {
          ctx.addIssue({
            code: 'custom',
            path: ['days', i, 'end'],
            message: 'End after the start.',
          });
        }
      }
    });
  });
export type SenderScheduleForm = z.infer<typeof senderScheduleFormSchema>;

/** Every day, 00:00 to 23:59: what new senders start with. */
export const allDayEveryDayForm = (timezone: string): SenderScheduleForm => ({
  timezone,
  days: WEEK_DAYS.map((dow) => ({ dow, enabled: true, start: '00:00', end: '23:59' })),
});

export function scheduleToForm(schedule: SenderSchedule | null | undefined): SenderScheduleForm {
  if (!schedule) return allDayEveryDayForm('Asia/Karachi');
  return {
    timezone: schedule.timezone,
    days: WEEK_DAYS.map((dow) => {
      const block = schedule.timeblocks.find((b) => b.dow === dow);
      return block
        ? {
            dow,
            enabled: true,
            start: clockTime(block.min),
            // A day saved elsewhere as ending at 24:00 shows as 23:59.
            end: clockTime(Math.min(block.max, END_OF_DAY)),
          }
        : { dow, enabled: false, start: '09:00', end: '18:00' };
    }),
  };
}

export function formToSchedule(form: SenderScheduleForm): SenderSchedule {
  return {
    timezone: form.timezone,
    timeblocks: form.days
      .filter((d) => d.enabled)
      .map((d) => ({ dow: d.dow, min: minutesOf(d.start), max: minutesOf(d.end) })),
  };
}

export const createSenderProfileInputSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(255),
  lastName: z.string().trim().min(1, 'Enter a last name.').max(255),
  label: z.string().trim().max(255, 'Keep the label under 255 characters.'),
});
export type CreateSenderProfileInput = z.infer<typeof createSenderProfileInputSchema>;

/**
 * How a reply reads, to decide whether to follow up. Labelled by placeholder rules for now; an AI
 * model will use the same labels.
 */
export const replySentimentSchema = z.enum([
  'positive',
  'neutral',
  'negative',
  'not_interested',
  'do_not_contact',
]);
export type ReplySentiment = z.infer<typeof replySentimentSchema>;

export const REPLY_SENTIMENT_LABELS: Record<ReplySentiment, string> = {
  positive: 'Interested',
  neutral: 'Neutral',
  negative: 'Negative',
  not_interested: 'Not interested',
  do_not_contact: 'Do not contact',
};

/** Carbon tag colours, from go-ahead (green) to stop (high contrast). */
export const REPLY_SENTIMENT_TAG = {
  positive: 'green',
  neutral: 'cool-gray',
  not_interested: 'magenta',
  negative: 'red',
  do_not_contact: 'high-contrast',
} as const satisfies Record<ReplySentiment, string>;

/** Something that happened in a thread besides a message. */
export const threadEventSchema = z.object({
  kind: z.enum(['connection_accepted', 'message_opened']),
  at: z.string(),
  /** The connection note accepted, or the message opened. */
  messageUuid: z.string(),
});
export type ThreadEvent = z.infer<typeof threadEventSchema>;

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
  /** On the last message of each run of replies after we wrote from the app. */
  sentiment: replySentimentSchema.nullable().optional(),
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
  /** When we first wrote from the app: the lead moves from New to Approaching. */
  approachedAt: z.string().nullable().optional(),
  /** How their latest reply reads. */
  sentiment: replySentimentSchema.nullable().optional(),
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

/**
 * A message we sent that GetSales hasn't delivered yet: `new` waits for the sender's next
 * schedule window (or its turn in the queue), `in_progress` is going out now.
 */
export const isQueuedMessage = (message: LinkedinMessage) =>
  message.direction === 'sent' && (message.status === 'new' || message.status === 'in_progress');

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
