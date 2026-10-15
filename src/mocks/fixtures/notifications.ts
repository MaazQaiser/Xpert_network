import type { Role } from '@/features/auth';
import type { Notification } from '@/features/notifications';
import { createId } from '@/shared/lib/id';

const hoursAgo = (now: Date, hours: number) =>
  new Date(now.getTime() - hours * 3600_000).toISOString();

type Seed = Omit<Notification, 'id' | 'createdAt'> & { hoursAgo: number };

const SEEDS: Record<string, Seed[]> = {
  usr_ayesha: [
    {
      event: 'report_published',
      title: 'New report matches your interests',
      body: 'GCC specialty coffee: store economics 2026 — built from 4 expert interviews.',
      href: '/library',
      read: false,
      hoursAgo: 2,
    },
    {
      event: 'product_update',
      title: 'Ask questions of any report you own',
      body: 'Answers cite the report section they come from.',
      href: '/library',
      read: true,
      hoursAgo: 72,
    },
    {
      event: 'account',
      title: 'Welcome to Proptyop',
      body: 'Start with a goal and we’ll scope the research with you.',
      href: '/ask',
      read: true,
      hoursAgo: 24 * 40,
    },
  ],
  usr_bilal: [
    {
      event: 'report_published',
      title: 'New report: Riyadh café supply chain',
      body: 'Supplier lead times and cold-chain costs for KSA cafés — 3 expert interviews.',
      href: '/library',
      read: false,
      hoursAgo: 5,
    },
    {
      event: 'account',
      title: 'Welcome to Proptyop',
      body: 'Start with a goal and we’ll scope the research with you.',
      href: '/ask',
      read: true,
      hoursAgo: 24 * 21,
    },
  ],
  usr_sara: [
    {
      event: 'call_match',
      title: 'Strong match: cold-chain capacity in Riyadh',
      body: '45-minute interview · 60 credits fee · closes in 6 days.',
      href: '/expert/calls',
      read: false,
      hoursAgo: 3,
    },
    {
      event: 'vetting_update',
      title: 'You’re approved as an expert',
      body: 'Open calls that match your expertise now appear on your home page.',
      href: '/expert/home',
      read: true,
      hoursAgo: 24 * 55,
    },
  ],
  usr_ops: [
    {
      event: 'brief_submitted',
      title: 'Brief waiting for a quote',
      body: 'Bilal Haddad · Riyadh café expansion · 3 questions not covered by the library.',
      href: '/admin/briefs',
      read: false,
      hoursAgo: 1,
    },
    {
      event: 'expert_applied',
      title: '2 expert profiles to review',
      body: 'Both submitted in the last 24 hours.',
      href: '/admin/experts',
      read: false,
      hoursAgo: 9,
    },
  ],
};

export function seedNotifications(userId: string, now = new Date()): Notification[] {
  return (SEEDS[userId] ?? []).map(({ hoursAgo: h, ...seed }) => ({
    ...seed,
    id: createId('ntf'),
    createdAt: hoursAgo(now, h),
  }));
}

export function welcomeNotification(role: Role, now = new Date()): Notification {
  return {
    id: createId('ntf'),
    event: 'account',
    title: 'Welcome to Proptyop',
    body:
      role === 'expert'
        ? 'Finish your expert profile and we’ll review it within 2 business days.'
        : 'Start with a goal and we’ll scope the research with you.',
    href: role === 'expert' ? '/expert/onboarding' : '/ask',
    read: false,
    createdAt: now.toISOString(),
  };
}

/** What the toolbar's "Push notification" sends, per role. */
export function demoNotification(role: Role, now = new Date()): Notification {
  const base = { id: createId('ntf'), read: false, createdAt: now.toISOString() };
  if (role === 'expert') {
    return {
      ...base,
      event: 'call_match',
      title: 'Strong match: supplier lead times in Jeddah',
      body: '30-minute interview · 45 credits fee · closes in 4 days.',
      href: '/expert/calls',
    };
  }
  if (role === 'admin') {
    return {
      ...base,
      event: 'interview_flagged',
      title: 'Interview flagged for a compliance check',
      body: 'Possible non-public information in section 3 of an interview.',
      href: '/admin/interviews',
    };
  }
  return {
    ...base,
    event: 'quote_ready',
    title: 'Your quote is ready',
    body: 'Custom research: 3 expert interviews in 10 days for 120 credits (≈ $600).',
    href: '/requests',
  };
}
