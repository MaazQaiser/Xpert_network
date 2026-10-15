import type { Metadata } from 'next';
import { RequestDetail } from '@/features/custom-requests';

export const metadata: Metadata = { title: 'Request' };

export default async function RequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <RequestDetail requestId={requestId} />;
}
