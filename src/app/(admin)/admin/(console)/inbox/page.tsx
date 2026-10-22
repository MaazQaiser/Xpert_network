import type { Metadata } from 'next';
import { Inbox } from '@/features/admin';

export const metadata: Metadata = { title: 'Inbox' };

export default function Page() {
  return <Inbox />;
}
