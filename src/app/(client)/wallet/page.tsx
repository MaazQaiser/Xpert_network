import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Wallet' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Wallet"
      flow="F6 · Wallet"
      phase={3}
      description="credit packs, balance, holds and transaction history."
    />
  );
}
