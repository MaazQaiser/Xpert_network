'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PageLoading } from '@/shared/ui';
import type { Role } from '@/features/auth';
import { useClientOnboarding, useExpertOnboarding } from '../../api/queries';
import { isFocusedPage, onboardingRedirect, type OnboardingState } from '../../model/gate';

type OnboardingGateProps = {
  role: Role;
  /** `isFocused`: hide the side nav (onboarding, or an expert not yet approved). */
  children: (isFocused: boolean) => ReactNode;
};

/**
 * Second guard after RequireRole: sends new clients to onboarding once and keeps experts on
 * onboarding / pending approval until they're approved (F1, F7).
 */
export function OnboardingGate({ role, children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useClientOnboarding({ enabled: role === 'client' });
  const expert = useExpertOnboarding({ enabled: role === 'expert' });

  const state: OnboardingState | null =
    role === 'client' && client.data
      ? { role, status: client.data.status }
      : role === 'expert' && expert.data
        ? { role, status: expert.data.status }
        : null;
  const isPending =
    (role === 'client' && client.isPending) || (role === 'expert' && expert.isPending);
  const redirectTo = state ? onboardingRedirect(state, pathname) : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (isPending || redirectTo) {
    return <PageLoading description="Loading your account" />;
  }
  // If the status can't load, fail open: each page has its own error state.
  return <>{children(state ? isFocusedPage(state, pathname) : false)}</>;
}
