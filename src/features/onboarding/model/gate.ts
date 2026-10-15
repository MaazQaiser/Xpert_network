import type { ClientOnboardingStatus } from './client.schema';
import type { VettingStatus } from './expert.schema';

export const ONBOARDING_ROUTES = {
  client: '/onboarding',
  expertOnboarding: '/expert/onboarding',
  expertPending: '/expert/pending',
} as const;

export type OnboardingState =
  { role: 'client'; status: ClientOnboardingStatus } | { role: 'expert'; status: VettingStatus };

/**
 * Where a signed-in user must go before using the app, or null to stay.
 * Clients are sent to onboarding once (it's skippable); experts can't use the app until
 * approved (PRODUCT_PLAN F1, F7).
 */
export function onboardingRedirect(state: OnboardingState, pathname: string): string | null {
  if (state.role === 'client') {
    return state.status === 'not_started' && pathname !== ONBOARDING_ROUTES.client
      ? ONBOARDING_ROUTES.client
      : null;
  }
  switch (state.status) {
    case 'approved':
      return null;
    case 'not_started':
    case 'in_progress':
      return pathname === ONBOARDING_ROUTES.expertOnboarding
        ? null
        : ONBOARDING_ROUTES.expertOnboarding;
    case 'pending':
    case 'rejected':
      return pathname === ONBOARDING_ROUTES.expertPending ? null : ONBOARDING_ROUTES.expertPending;
  }
}

/** Focused pages hide the side nav so the task has the user's full attention. */
export function isFocusedPage(state: OnboardingState, pathname: string): boolean {
  if (state.role === 'expert' && state.status !== 'approved') return true;
  return pathname === ONBOARDING_ROUTES.client || pathname === ONBOARDING_ROUTES.expertOnboarding;
}
