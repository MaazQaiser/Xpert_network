import type { Metadata } from 'next';
import { SendToClient } from '@/features/admin';

export const metadata: Metadata = { title: 'Send to client' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SendToClient projectId={projectId} />;
}
