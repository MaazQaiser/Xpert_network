import type { Metadata } from 'next';
import { RequestSession } from '@/features/open-calls';

export const metadata: Metadata = { title: 'Interview' };

export default async function Page({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  return <RequestSession callId={callId} />;
}
