import type { Metadata } from 'next';
import { Calls } from '@/features/admin';

export const metadata: Metadata = { title: 'Calls' };

export default function Page() {
  return <Calls />;
}
