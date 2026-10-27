import type { Metadata } from 'next';
import { Scheduling } from '@/features/admin';

export const metadata: Metadata = { title: 'Scheduling' };

export default function Page() {
  return <Scheduling />;
}
