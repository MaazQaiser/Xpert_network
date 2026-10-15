import type { Metadata } from 'next';
import { WalletOverview } from '@/features/wallet';

export const metadata: Metadata = { title: 'Wallet' };

export default function WalletPage() {
  return <WalletOverview />;
}
