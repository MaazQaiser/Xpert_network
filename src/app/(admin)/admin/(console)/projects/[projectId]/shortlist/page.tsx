import type { Metadata } from 'next';
import { AiShortlist } from '@/features/admin';

export const metadata: Metadata = { title: 'AI shortlist' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AiShortlist projectId={projectId} />;
}
