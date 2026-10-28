import { z } from 'zod';
import {
  answerSchema,
  clientExpertCardSchema,
  formQuestionSchema,
  outreachPosterSchema,
  slotSchema,
} from './journey.schema';

/** Screens 09, 16, 17–23 and the secure link pages: payloads the console adds on top of F14–F20. */

export const availabilityPatchSchema = z
  .object({ holdSlots: z.boolean(), holdHours: z.number().int().positive().max(168) })
  .partial();
export type AvailabilityPatch = z.infer<typeof availabilityPatchSchema>;

export const callSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  title: z.string(),
  expertLetter: z.string(),
  expertRole: z.string(),
  slotLabel: z.string().nullable(),
  status: z.enum(['scheduled', 'live', 'ended']),
});
export type CallSummary = z.infer<typeof callSummarySchema>;

export const callPatchSchema = z
  .object({ coveredId: z.string(), status: z.enum(['scheduled', 'live', 'ended']) })
  .partial();
export type CallPatch = z.infer<typeof callPatchSchema>;

export const outreachSummarySchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  clientName: z.string(),
  status: z.enum(['not_started', 'draft', 'published', 'screening', 'onboarding', 'done']),
  applicants: z.number().int().min(0),
  requirement: z.string(),
});
export type OutreachSummary = z.infer<typeof outreachSummarySchema>;

export const outreachActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('publish') }),
  z.object({ action: z.literal('send_client_update') }),
  z.object({ action: z.literal('toggle_applicant'), applicantId: z.string() }),
  z.object({ action: z.literal('send_questions') }),
  z.object({ action: z.literal('add_top'), ids: z.array(z.string()).min(1) }),
  z.object({ action: z.literal('mark_onboarded'), applicantId: z.string() }),
  z.object({ action: z.literal('complete') }),
]);
export type OutreachAction = z.infer<typeof outreachActionSchema>;

export const outreachPosterPatchSchema = outreachPosterSchema.partial();
export type OutreachPosterPatch = z.infer<typeof outreachPosterPatchSchema>;

export const newProjectSchema = z.object({
  name: z.string().trim().min(5, 'Name the project in a few words.').max(120),
  clientId: z.string().min(1, 'Choose a client.'),
  contactName: z.string().trim().min(2, 'Add the contact’s name.').max(80),
  contactEmail: z.email('Add a valid email address.'),
  brief: z.string().trim().min(20, 'Write at least a sentence for the brief.').max(1500),
});
export type NewProject = z.infer<typeof newProjectSchema>;

export const clientPatchSchema = z
  .object({ anonymiseExperts: z.boolean(), owner: z.string(), domains: z.array(z.string()) })
  .partial();
export type ClientRecordPatch = z.infer<typeof clientPatchSchema>;

export const expertPatchSchema = z
  .object({
    tags: z.array(z.string()),
    rate: z.number().positive(),
    compliance: z.enum(['complete', 'pending', 'expired']),
  })
  .partial();
export type ExpertRecordPatch = z.infer<typeof expertPatchSchema>;

export const teamPatchSchema = z.object({ active: z.boolean() }).partial();
export type TeamPatch = z.infer<typeof teamPatchSchema>;

export const teamInviteSchema = z.object({
  name: z.string().trim().min(2, 'Add a name.').max(80),
  email: z.email('Add a valid email address.'),
});
export type TeamInvite = z.infer<typeof teamInviteSchema>;

/** Secure link pages (/l/*) and the expert app share these views. */
const linkBase = {
  token: z.string(),
  projectLabel: z.string(),
  expiresAt: z.string(),
};

export const linkViewSchema = z.discriminatedUnion('purpose', [
  z.object({
    purpose: z.literal('form'),
    ...linkBase,
    status: z.enum(['open', 'submitted']),
    role: z.string(),
    pay: z.string(),
    minutes: z.number().int().positive(),
    clientName: z.string().nullable(),
    questions: z.array(formQuestionSchema),
    answers: z.array(answerSchema),
  }),
  z.object({
    purpose: z.literal('availability'),
    ...linkBase,
    status: z.enum(['open', 'submitted']),
    role: z.string(),
    holdHours: z.number().int().positive(),
    timezone: z.string(),
    slots: z.array(slotSchema),
    selectedSlotIds: z.array(z.string()),
  }),
  z.object({
    purpose: z.literal('pick'),
    ...linkBase,
    status: z.enum(['open', 'submitted']),
    clientName: z.string(),
    contactName: z.string(),
    subject: z.string(),
    pickLimit: z.number().int().positive(),
    showRates: z.boolean(),
    replyBy: z.string(),
    experts: z.array(clientExpertCardSchema),
  }),
  z.object({
    purpose: z.literal('onboard'),
    ...linkBase,
    status: z.enum(['open', 'submitted']),
    applicantName: z.string(),
    rate: z.number(),
    steps: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
]);
export type LinkView = z.infer<typeof linkViewSchema>;

export const linkEnvelopeSchema = z.object({
  state: z.enum(['ok', 'expired']),
  view: linkViewSchema.nullable(),
});
export type LinkEnvelope = z.infer<typeof linkEnvelopeSchema>;

export const linkDraftSchema = z.object({ answers: z.array(answerSchema) });
export const availabilitySubmitSchema = z.object({
  slotIds: z.array(z.string()).min(1, 'Choose at least one time.'),
});
export const onboardSubmitSchema = z.object({
  rate: z.number().positive('Enter your hourly rate.'),
  stepIds: z.array(z.string()).min(4, 'Confirm all four steps.'),
});
export type OnboardSubmit = z.infer<typeof onboardSubmitSchema>;

export const invitationSchema = z.object({
  token: z.string(),
  projectId: z.string(),
  title: z.string(),
  pay: z.string(),
  expiresAt: z.string(),
  status: z.enum(['new', 'in_progress', 'submitted']),
  answered: z.number().int().min(0),
  total: z.number().int().min(0),
  availabilityToken: z.string().nullable(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const upcomingCallSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  slotLabel: z.string(),
  startsAt: z.string(),
  inviteLink: z.string().nullable(),
  briefingReady: z.boolean(),
  clientName: z.string(),
});
export type UpcomingCall = z.infer<typeof upcomingCallSchema>;
