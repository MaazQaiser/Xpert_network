import type { Metadata } from 'next';
import { ExpertHome } from '@/features/onboarding';

export const metadata: Metadata = { title: 'Expert home' };

export default function Page() {
  return <ExpertHome />;
}
