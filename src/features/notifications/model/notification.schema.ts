import { z } from 'zod';
import type { Role } from '@/features/auth';

/** Every kind of notification; all but `account` can be switched off per channel (F17). */
export const notificationEventSchema = z.enum([
  'account',
  'report_published',
  'quote_ready',
  'request_update',
  'low_balance',
  'call_match',
  'application_update',
  'interview_reminder',
  'vetting_update',
  'payout_update',
  'brief_submitted',
  'expert_applied',
  'interview_flagged',
  'product_update',
]);
export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  event: notificationEventSchema,
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  createdAt: z.string(),
  read: z.boolean(),
});
export type Notification = z.infer<typeof notificationSchema>;

export type PreferenceEvent = Exclude<NotificationEvent, 'account'>;

/** What each role can be notified about, in settings order. */
export const ROLE_EVENTS: Record<
  Role,
  { event: PreferenceEvent; label: string; detail: string }[]
> = {
  client: [
    {
      event: 'report_published',
      label: 'New library reports',
      detail: 'Reports that match your research interests.',
    },
    {
      event: 'quote_ready',
      label: 'Quotes',
      detail: 'When a quote for your custom request is ready.',
    },
    {
      event: 'request_update',
      label: 'Custom request progress',
      detail: 'Interviews scheduled, research delivered.',
    },
    {
      event: 'low_balance',
      label: 'Low credit balance',
      detail: 'When your balance drops below 50 credits.',
    },
    { event: 'product_update', label: 'Product news', detail: 'New features and tips.' },
  ],
  expert: [
    {
      event: 'call_match',
      label: 'Matching open calls',
      detail: 'New calls on your topics and regions.',
    },
    {
      event: 'application_update',
      label: 'Application updates',
      detail: 'When you’re accepted for a call.',
    },
    {
      event: 'interview_reminder',
      label: 'Interview reminders',
      detail: 'A day before an interview is due.',
    },
    {
      event: 'vetting_update',
      label: 'Profile review',
      detail: 'Decisions on your expert profile.',
    },
    { event: 'payout_update', label: 'Payouts', detail: 'When a payout is sent.' },
    { event: 'product_update', label: 'Product news', detail: 'New features and tips.' },
  ],
  admin: [
    {
      event: 'brief_submitted',
      label: 'Briefs waiting for a quote',
      detail: 'When a client asks for custom research.',
    },
    {
      event: 'expert_applied',
      label: 'Expert applications',
      detail: 'New profiles to review.',
    },
    {
      event: 'interview_flagged',
      label: 'Flagged interviews',
      detail: 'Interviews the AI flagged for a compliance check.',
    },
    { event: 'product_update', label: 'Product news', detail: 'New features and tips.' },
  ],
};
