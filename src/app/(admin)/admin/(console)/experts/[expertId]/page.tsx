import type { Metadata } from 'next';
import { ExpertDetail } from '@/features/admin';

export const metadata: Metadata = { title: 'Expert' };

export default async function Page({ params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  return <ExpertDetail expertId={expertId} />;
}
