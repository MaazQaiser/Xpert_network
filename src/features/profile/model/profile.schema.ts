import { z } from 'zod';
import { newPasswordField } from '@/features/auth';
import { notificationEventSchema } from '@/features/notifications';

// ——— Profile ————————————————————————————————————————————————————————

export const TIMEZONES = [
  { id: 'Asia/Riyadh', label: 'Riyadh (GMT+3)' },
  { id: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { id: 'Asia/Qatar', label: 'Doha (GMT+3)' },
  { id: 'Asia/Kuwait', label: 'Kuwait City (GMT+3)' },
  { id: 'Africa/Cairo', label: 'Cairo (GMT+3)' },
  { id: 'Asia/Karachi', label: 'Karachi (GMT+5)' },
  { id: 'Asia/Kolkata', label: 'Mumbai (GMT+5:30)' },
  { id: 'Europe/London', label: 'London (GMT+1)' },
] as const;

export const profileSchema = z.object({
  name: z.string(),
  title: z.string(),
  organisation: z.string(),
  email: z.string(),
  phone: z.string(),
  timezone: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  title: z.string().trim().max(90, 'Keep it under 90 characters.'),
  organisation: z.string().trim().max(90, 'Keep it under 90 characters.'),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\+\d[\d\s-]{6,18}$/.test(v),
      'Use international format, like +966 50 123 4567.',
    ),
  timezone: z.string().min(1, 'Choose your time zone.'),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ——— Notification preferences ———————————————————————————————————————

export const preferenceEventSchema = notificationEventSchema.exclude(['account']);

export const digestSchema = z.enum(['instant', 'daily', 'weekly']);
export type Digest = z.infer<typeof digestSchema>;

export const notificationPreferencesSchema = z.object({
  digest: digestSchema,
  channels: z.array(
    z.object({ event: preferenceEventSchema, email: z.boolean(), inApp: z.boolean() }),
  ),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

// ——— Security (mocked) ——————————————————————————————————————————————

export const sessionInfoSchema = z.object({
  id: z.string(),
  device: z.string(),
  location: z.string(),
  lastActiveAt: z.string(),
  isCurrent: z.boolean(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

export const securitySchema = z.object({
  twoFactorEnabled: z.boolean(),
  passwordChangedAt: z.string().nullable(),
  sessions: z.array(sessionInfoSchema),
});
export type Security = z.infer<typeof securitySchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: newPasswordField,
    confirm: z.string().min(1, 'Repeat your new password.'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'The passwords don’t match. Check both fields.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password you haven’t used here before.',
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export const twoFactorCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});
export type TwoFactorCodeValues = z.infer<typeof twoFactorCodeSchema>;
