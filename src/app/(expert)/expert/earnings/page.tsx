import type { Metadata } from 'next';
import { EarningsView } from '@/features/earnings';

export const metadata: Metadata = { title: 'Earnings' };

export default function Page() {
  return <EarningsView />;
}
