import type { Metadata } from 'next';
import { ExpertPending } from '@/features/onboarding';

export const metadata: Metadata = { title: 'Review status' };

export default function ExpertPendingPage() {
  return <ExpertPending />;
}
