import type { Metadata } from 'next';
import { ExpertOnboardingFlow } from '@/features/onboarding';

export const metadata: Metadata = { title: 'Set up your expert profile' };

export default function ExpertOnboardingPage() {
  return <ExpertOnboardingFlow />;
}
