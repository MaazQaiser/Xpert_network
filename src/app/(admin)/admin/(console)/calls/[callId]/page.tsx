import type { Metadata } from 'next';
import { CallReview } from '@/features/admin';

export const metadata: Metadata = { title: 'Call review' };

export default async function Page({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  return <CallReview callId={callId} />;
}
