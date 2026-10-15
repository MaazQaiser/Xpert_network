import type { Metadata } from 'next';
import { ClientOnboardingFlow } from '@/features/onboarding';

export const metadata: Metadata = { title: 'Set up your account' };

export default function OnboardingPage() {
  return <ClientOnboardingFlow />;
}
