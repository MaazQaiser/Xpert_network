import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Finance' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Finance"
      flow="F6 · Credits and payouts"
      phase={6}
      description="credit sales, holds and expert payouts."
    />
  );
}
