import { ROLE_EVENTS } from '@/features/notifications';
import type { Role } from '@/features/auth';
import type { NotificationPreferences, Profile, Security } from '@/features/profile';

export type ProfileExtras = Pick<Profile, 'phone' | 'timezone'>;

export const SEED_PROFILE_EXTRAS: Record<string, ProfileExtras> = {
  usr_ayesha: { phone: '+971 50 214 7781', timezone: 'Asia/Dubai' },
  usr_bilal: { phone: '+966 55 310 4420', timezone: 'Asia/Riyadh' },
  usr_sara: { phone: '+971 52 880 1934', timezone: 'Asia/Dubai' },
  usr_ops: { phone: '', timezone: 'Asia/Dubai' },
};

export const DEFAULT_PROFILE_EXTRAS: ProfileExtras = { phone: '', timezone: 'Asia/Riyadh' };

export function defaultPreferences(role: Role): NotificationPreferences {
  return {
    digest: 'instant',
    channels: ROLE_EVENTS[role].map(({ event }) => ({
      event,
      email: event !== 'product_update',
      inApp: true,
    })),
  };
}

const hoursAgo = (now: Date, hours: number) =>
  new Date(now.getTime() - hours * 3600_000).toISOString();

export function defaultSecurity(now = new Date(), withHistory = true): Security {
  return {
    twoFactorEnabled: false,
    passwordChangedAt: withHistory ? hoursAgo(now, 24 * 96) : null,
    sessions: [
      {
        id: 'ses_current',
        device: 'Chrome on macOS',
        location: 'Dubai, UAE',
        lastActiveAt: now.toISOString(),
        isCurrent: true,
      },
      ...(withHistory
        ? [
            {
              id: 'ses_iphone',
              device: 'Safari on iPhone',
              location: 'Riyadh, Saudi Arabia',
              lastActiveAt: hoursAgo(now, 20),
              isCurrent: false,
            },
            {
              id: 'ses_windows',
              device: 'Edge on Windows',
              location: 'Doha, Qatar',
              lastActiveAt: hoursAgo(now, 24 * 9),
              isCurrent: false,
            },
          ]
        : []),
    ],
  };
}
