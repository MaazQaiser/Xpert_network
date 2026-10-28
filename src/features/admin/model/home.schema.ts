import { z } from 'zod';

/** A client reply that still needs the calls booked. Shown on Home until the meetings are booked. */
export const bookingCueSchema = z.object({
  requestId: z.string(),
  fromName: z.string(),
  subject: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  pickCount: z.number().int().min(1),
});
export type BookingCue = z.infer<typeof bookingCueSchema>;

export const homeSummarySchema = z.object({
  newProjectEmails: z.number().int().min(0),
  expertsPendingReview: z.number().int().min(0),
  activeProjects: z.number().int().min(0),
  /** The newest client reply that is waiting to be booked, or null. */
  bookingEmail: bookingCueSchema.nullable(),
});
export type HomeSummary = z.infer<typeof homeSummarySchema>;

/** An email the assistant puts in front of the PM to pick from (Home chat). */
export const chatEmailSchema = z.object({
  requestId: z.string(),
  from: z.object({ name: z.string(), email: z.string() }),
  company: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  attachment: z.string().nullable(),
  /** Why the AI put it here, in a few words ("Brief ready to review"). */
  reason: z.string(),
  projectId: z.string().nullable(),
  /** What picking it asks the assistant, e.g. "Give me the brief for Medical distributors: ERP & EDI integration". */
  prompt: z.string(),
  /** The label on the pick button. */
  action: z.string(),
});
export type ChatEmail = z.infer<typeof chatEmailSchema>;

/** A next step the assistant suggests: ask it something, or go somewhere. */
export const chatChipSchema = z.object({
  label: z.string(),
  prompt: z.string().nullable(),
  href: z.string().nullable(),
});
export type ChatChip = z.infer<typeof chatChipSchema>;

/** Rich parts of an answer, shown under its text in the Home chat. */
export const chatBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('emails'), items: z.array(chatEmailSchema) }),
  /** The project brief as an editable document canvas. */
  z.object({ kind: z.literal('brief'), projectId: z.string() }),
  /** The AI searching the network for a project, then its top-ranked experts to approach. */
  z.object({ kind: z.literal('expertSearch'), projectId: z.string() }),
  /** Who answered a project's screening questions, how well, and their answers to read. */
  z.object({
    kind: z.literal('screeningAnswers'),
    projectId: z.string(),
    /** One expert's answers: their report opens straight away. */
    expertId: z.string().optional(),
    expertName: z.string().optional(),
  }),
  /** The AI asking to create the project file from the brief above, with the button to say yes. */
  z.object({ kind: z.literal('createProject'), projectId: z.string() }),
  /** The requirements the AI will search on, for the PM to review before finding experts. */
  z.object({ kind: z.literal('requirements'), projectId: z.string() }),
  /** The one next step the assistant proposes, as a primary button that asks it to go on. */
  z.object({ kind: z.literal('action'), label: z.string(), prompt: z.string() }),
  /** One email, summarised: what they asked, what came with it, what's missing. */
  z.object({
    kind: z.literal('emailSummary'),
    email: chatEmailSchema,
    points: z.array(z.object({ label: z.string(), value: z.string() })),
    missing: z.array(z.string()),
  }),
  /** A reply the assistant drafted for the PM to check. */
  z.object({
    kind: z.literal('draftReply'),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal('experts'),
    items: z.array(
      z.object({
        projectId: z.string(),
        projectName: z.string(),
        client: z.string(),
        count: z.number().int().min(0),
        href: z.string(),
        /** Asks the assistant to open the answers in the chat. */
        prompt: z.string().optional(),
      }),
    ),
  }),
  /** Projects, with where each one stands. */
  z.object({
    kind: z.literal('projects'),
    items: z.array(
      z.object({
        projectId: z.string(),
        projectName: z.string(),
        client: z.string(),
        status: z.string(),
        href: z.string(),
      }),
    ),
  }),
  /** The team roster: open work, booked work, and time to a brief. */
  z.object({
    kind: z.literal('team'),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        openProjects: z.number().int().min(0),
        bookedProjects: z.number().int().min(0),
        avgHoursToBrief: z.number().nullable(),
        active: z.boolean(),
      }),
    ),
  }),
  /** A short company snapshot: stage, reviews waiting, emails stuck. */
  z.object({
    kind: z.literal('stats'),
    items: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  /** The email that shares the picked expert profiles with the client. */
  z.object({ kind: z.literal('clientEmail'), projectId: z.string() }),
  /** The client's reply, and the yes that books the meetings. */
  z.object({ kind: z.literal('bookMeetings'), projectId: z.string() }),
]);
export type ChatBlock = z.infer<typeof chatBlockSchema>;

export const assistantReplySchema = z.object({
  id: z.string(),
  text: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  /** What the answer was built from, shown in the AI label. */
  basis: z.string(),
  blocks: z.array(chatBlockSchema).default([]),
  chips: z.array(chatChipSchema).default([]),
});
export type AssistantReply = z.output<typeof assistantReplySchema>;

/** What each Home summary card asks the assistant. */
export const CARD_PROMPTS = {
  emails: 'Share today’s new project email details',
  experts: 'Which expert reviews need my sign-off?',
  active: 'Which active projects need me today?',
} as const;

export const assistantInputSchema = z.object({ text: z.string().trim().min(1).max(500) });

export const SUGGESTED_PROMPTS = [
  'Share progress of all projects',
  'Show the team progress report',
  'Show overall company progress',
] as const;
