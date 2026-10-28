import type { Metadata } from 'next';
import { Experts } from '@/features/admin';

export const metadata: Metadata = { title: 'Experts' };

export default function Page() {
  return <Experts />;
}
