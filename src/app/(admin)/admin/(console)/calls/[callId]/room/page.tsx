import type { Metadata } from 'next';
import { MeetingRoom } from '@/features/admin';

export const metadata: Metadata = { title: 'Call' };

export default async function Page({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  return <MeetingRoom callId={callId} />;
}
