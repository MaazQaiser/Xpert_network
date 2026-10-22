import type { Metadata } from 'next';
import { MatchedExperts } from '@/features/admin';

export const metadata: Metadata = { title: 'Matched experts' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <MatchedExperts projectId={projectId} />;
}
