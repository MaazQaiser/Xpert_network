import type { Metadata } from 'next';
import { CallDetail } from '@/features/open-calls';

export const metadata: Metadata = { title: 'Open call' };

export default async function Page({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  return <CallDetail callId={callId} />;
}
