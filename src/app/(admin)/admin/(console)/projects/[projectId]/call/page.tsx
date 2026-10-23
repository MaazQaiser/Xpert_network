import type { Metadata } from 'next';
import { CallWorkspace } from '@/features/admin';

export const metadata: Metadata = { title: 'Live call' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CallWorkspace projectId={projectId} />;
}
