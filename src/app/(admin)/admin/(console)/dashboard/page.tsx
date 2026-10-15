import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Dashboard"
      flow="F11 · Admin dashboard"
      phase={6}
      description="queues for experts to approve, briefs awaiting a quote, interviews to check and payouts."
    />
  );
}
