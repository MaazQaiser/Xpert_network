import type { Metadata } from 'next';
import { Inbox } from '@/features/admin';

export const metadata: Metadata = { title: 'Inbox' };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <Inbox selectedId={requestId} />;
}
