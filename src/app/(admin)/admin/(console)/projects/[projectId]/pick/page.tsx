import type { Metadata } from 'next';
import { ClientPick } from '@/features/admin';

export const metadata: Metadata = { title: 'Client’s picks' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ClientPick projectId={projectId} />;
}
