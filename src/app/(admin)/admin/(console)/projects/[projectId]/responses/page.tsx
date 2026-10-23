import type { Metadata } from 'next';
import { Responses } from '@/features/admin';

export const metadata: Metadata = { title: 'Screening answers' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Responses projectId={projectId} />;
}
