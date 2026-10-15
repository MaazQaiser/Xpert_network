import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Experts' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Experts"
      flow="F12 · Approve experts"
      phase={6}
      description="the vetting queue with AI fit scores and red flags."
    />
  );
}
