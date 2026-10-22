import type { Metadata } from 'next';
import { ProjectFile } from '@/features/admin';

export const metadata: Metadata = { title: 'Project file' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectFile projectId={projectId} />;
}
