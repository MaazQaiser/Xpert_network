import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Earnings' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Earnings"
      flow="F10 · Earnings"
      phase={5}
      description="pending, approved and paid interview fees, and payout requests."
    />
  );
}
