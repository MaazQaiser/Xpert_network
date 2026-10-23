import type { Metadata } from 'next';
import { SyncExperts } from '@/features/admin';

export const metadata: Metadata = { title: 'Sync with experts' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SyncExperts projectId={projectId} />;
}
