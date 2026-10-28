import { z } from 'zod';

/** F14: AI pitch email + 15-question form sent to selected experts. */
export const formQuestionKindSchema = z.enum(['long', 'short', 'yes_no', 'number', 'checkbox']);
export type FormQuestionKind = z.infer<typeof formQuestionKindSchema>;

export const formQuestionSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  text: z.string(),
  kind: formQuestionKindSchema,
  source: z.enum(['client', 'screening']),
  locked: z.boolean(),
});
export type FormQuestion = z.infer<typeof formQuestionSchema>;

export const pitchRecipientSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  country: z.string(),
  matchPercent: z.number(),
  role: z.string(),
});
export type PitchRecipient = z.infer<typeof pitchRecipientSchema>;

export const pitchSchema = z.object({
  projectId: z.string(),
  subject: z.string(),
  body: z.string(),
  ai: z.object({ subject: z.string(), body: z.string() }),
  answerByHours: z.number().int().positive(),
  reminder: z.enum(['none', 'email_24h', 'email_sms_24h']),
  hideClientName: z.boolean(),
  askCompliance: z.boolean(),
  questions: z.array(formQuestionSchema),
  recipients: z.array(pitchRecipientSchema),
  sentAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type Pitch = z.infer<typeof pitchSchema>;

export const pitchPatchSchema = z
  .object({
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(20).max(5000),
    answerByHours: z.number().int().positive(),
    reminder: z.enum(['none', 'email_24h', 'email_sms_24h']),
    hideClientName: z.boolean(),
    askCompliance: z.boolean(),
    questions: z.array(formQuestionSchema),
  })
  .partial();
export type PitchPatch = z.infer<typeof pitchPatchSchema>;

/** Expert answers to the 15-question form. */
export const answerSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  cantSpeak: z.boolean(),
  wordCount: z.number().int().min(0),
});
export type Answer = z.infer<typeof answerSchema>;

export const questionnaireResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  expertId: z.string(),
  displayId: z.string(),
  role: z.string(),
  country: z.string(),
  status: z.enum(['invited', 'in_progress', 'submitted', 'declined']),
  answered: z.number().int().min(0),
  total: z.number().int().positive(),
  quality: z.number().min(0).max(100).nullable(),
  coverage: z.array(z.string()),
  complianceSigned: z.boolean(),
  selected: z.boolean(),
  answers: z.array(answerSchema),
  submittedAt: z.string().nullable(),
  linkToken: z.string(),
  expiresAt: z.string(),
});
export type QuestionnaireResponse = z.infer<typeof questionnaireResponseSchema>;

export const responsesBundleSchema = z.object({
  projectId: z.string(),
  invited: z.number().int().min(0),
  submitted: z.number().int().min(0),
  aiPickIds: z.array(z.string()),
  responses: z.array(questionnaireResponseSchema),
});
export type ResponsesBundle = z.infer<typeof responsesBundleSchema>;

export const responsePatchSchema = z.object({
  selectedIds: z.array(z.string()).optional(),
});
export type ResponsePatch = z.infer<typeof responsePatchSchema>;

export const formSubmitSchema = z.object({
  answers: z.array(answerSchema),
});
export type FormSubmit = z.infer<typeof formSubmitSchema>;

/** F15: availability slots held for the client. */
export const slotSchema = z.object({
  id: z.string(),
  label: z.string(),
  startsAt: z.string(),
});
export type Slot = z.infer<typeof slotSchema>;

export const availabilityRowSchema = z.object({
  expertId: z.string(),
  displayId: z.string(),
  role: z.string(),
  status: z.enum(['confirmed', 'waiting', 'declined']),
  complianceSigned: z.boolean(),
  slots: z.array(slotSchema),
  letter: z.string(),
});
export type AvailabilityRow = z.infer<typeof availabilityRowSchema>;

export const availabilityBundleSchema = z.object({
  projectId: z.string(),
  timezone: z.string(),
  askedAt: z.string(),
  holdHours: z.number().int().positive(),
  holdSlots: z.boolean(),
  confirmed: z.number().int().min(0),
  waiting: z.number().int().min(0),
  declined: z.number().int().min(0),
  complianceSigned: z.number().int().min(0),
  experts: z.array(availabilityRowSchema),
});
export type AvailabilityBundle = z.infer<typeof availabilityBundleSchema>;

export const clientExpertCardSchema = z.object({
  letter: z.string(),
  expertId: z.string(),
  headline: z.string(),
  years: z.number().int(),
  country: z.string(),
  quote: z.string(),
  bestFor: z.array(z.string()),
  slots: z.array(slotSchema),
  rate: z.number().nullable(),
});
export type ClientExpertCard = z.infer<typeof clientExpertCardSchema>;

export const clientSendSchema = z.object({
  projectId: z.string(),
  to: z.object({ name: z.string(), email: z.string() }),
  cc: z.array(z.object({ name: z.string(), email: z.string() })),
  subject: z.string(),
  body: z.string(),
  ai: z.object({ subject: z.string(), body: z.string() }),
  experts: z.array(clientExpertCardSchema),
  hideNames: z.boolean(),
  includeSummaries: z.boolean(),
  pickLimit: z.number().int().positive(),
  showRates: z.boolean(),
  replyBy: z.string(),
  coverage: z.array(
    z.object({ questionId: z.string(), label: z.string(), letters: z.array(z.string()) }),
  ),
  pickToken: z.string(),
  sentAt: z.string().nullable(),
  clientNote: z.string().nullable(),
  picks: z
    .array(z.object({ expertId: z.string(), letter: z.string(), slotId: z.string() }))
    .nullable(),
  syncedAt: z.string().nullable(),
});
export type ClientSend = z.infer<typeof clientSendSchema>;

export const clientSendPatchSchema = z
  .object({
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(20).max(5000),
    hideNames: z.boolean(),
    includeSummaries: z.boolean(),
    pickLimit: z.number().int().positive().max(5),
    showRates: z.boolean(),
    removeExpertId: z.string(),
  })
  .partial();
export type ClientSendPatch = z.infer<typeof clientSendPatchSchema>;

export const clientPickSchema = z.object({
  picks: z
    .array(z.object({ expertId: z.string(), slotId: z.string() }))
    .min(1)
    .max(5),
  note: z.string().max(1000).optional(),
});
export type ClientPick = z.infer<typeof clientPickSchema>;

export const bookingSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  expertId: z.string(),
  displayId: z.string(),
  letter: z.string(),
  role: z.string(),
  slot: slotSchema,
  status: z.enum(['held', 'confirmed', 'released']),
  inviteLink: z.string().nullable(),
  briefingReady: z.boolean(),
});
export type Booking = z.infer<typeof bookingSchema>;

export const bookedProjectSchema = z.object({
  projectId: z.string(),
  lockedAt: z.string(),
  version: z.string(),
  checklist: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })),
  bookings: z.array(bookingSchema),
  briefingPack: z.string(),
});
export type BookedProject = z.infer<typeof bookedProjectSchema>;

/** F16: live call workspace. */
export const callRequestSchema = z.object({
  id: z.string(),
  kind: z.enum(['document', 'removed_requirement', 'new_expert']),
  text: z.string(),
  at: z.string(),
});

export const callWorkspaceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  expertLetter: z.string(),
  expertRole: z.string(),
  status: z.enum(['scheduled', 'live', 'ended']),
  startedAt: z.string().nullable(),
  transcript: z.array(
    z.object({
      id: z.string(),
      speaker: z.enum(['client', 'expert', 'ai']),
      text: z.string(),
      at: z.string(),
    }),
  ),
  requests: z.array(callRequestSchema),
  questionsCovered: z.array(z.object({ id: z.string(), label: z.string(), covered: z.boolean() })),
  documents: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string() })),
});
export type CallWorkspace = z.infer<typeof callWorkspaceSchema>;

/** F19: outreach hiring. */
export const outreachPosterSchema = z.object({
  headline: z.string(),
  projectSummary: z.string(),
  category: z.string(),
  experience: z.string(),
  region: z.string(),
  count: z.number().int().positive(),
  pay: z.string(),
  deadline: z.string(),
  mustHaves: z.array(z.string()),
  howToApply: z.string(),
});

export const outreachApplicantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  tag: z.enum(['fits_all', 'fits_partial', 'conflict', 'not_a_fit']),
  fits: z.string(),
  cvName: z.string(),
  selected: z.boolean(),
  complianceOk: z.boolean(),
});

export const outreachCampaignSchema = z.object({
  projectId: z.string(),
  status: z.enum(['draft', 'published', 'screening', 'onboarding', 'done']),
  blockingRequirement: z.string(),
  closest: z.array(z.object({ id: z.string(), role: z.string(), misses: z.string() })),
  poster: outreachPosterSchema,
  clientUpdateSentAt: z.string().nullable(),
  applicants: z.array(outreachApplicantSchema),
  questionsSentAt: z.string().nullable(),
  topIds: z.array(z.string()),
  onboardedIds: z.array(z.string()),
  publishedAt: z.string().nullable(),
});
export type OutreachCampaign = z.infer<typeof outreachCampaignSchema>;

/** F20: directory records + trash. */
export const clientRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  domains: z.array(z.string()),
  contacts: z.array(z.object({ name: z.string(), email: z.string(), role: z.string() })),
  activeProjects: z.number().int().min(0),
  anonymiseExperts: z.boolean(),
  owner: z.string(),
});
export type ClientRecord = z.infer<typeof clientRecordSchema>;

export const expertRecordSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  name: z.string(),
  role: z.string(),
  country: z.string(),
  tags: z.array(z.string()),
  rate: z.number(),
  compliance: z.enum(['complete', 'pending', 'expired']),
  source: z.enum(['network', 'outreach']),
  lastEngaged: z.string().nullable(),
});
export type ExpertRecord = z.infer<typeof expertRecordSchema>;

export const trashEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(['project', 'expert', 'client']),
  label: z.string(),
  deletedAt: z.string(),
  expiresAt: z.string(),
  daysLeft: z.number().int().min(0),
});
export type TrashEntry = z.infer<typeof trashEntrySchema>;

/** F18: team + audit. */
export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  openProjects: z.number().int().min(0),
  bookedProjects: z.number().int().min(0),
  avgHoursToBrief: z.number().nullable(),
  active: z.boolean(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.string(),
  action: z.string(),
  projectId: z.string().nullable(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/** Secure link payloads for /l/* pages. */
export const linkPurposeSchema = z.enum(['form', 'availability', 'pick', 'onboard']);
export type LinkPurpose = z.infer<typeof linkPurposeSchema>;

export const secureLinkSchema = z.object({
  token: z.string(),
  purpose: linkPurposeSchema,
  projectId: z.string(),
  recordId: z.string(),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
});
export type SecureLink = z.infer<typeof secureLinkSchema>;

export const mailMessageSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  direction: z.enum(['out', 'in']),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
  linkToken: z.string().nullable(),
  kind: z.enum(['pitch', 'clarification', 'client_send', 'client_reply', 'availability', 'other']),
});
export type MailMessage = z.infer<typeof mailMessageSchema>;
