import type { Metadata } from 'next';
import { ReportReader } from '@/features/admin';

export const metadata: Metadata = { title: 'Report' };

export default async function Page({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  return <ReportReader callId={callId} />;
}
