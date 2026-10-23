import type { Metadata } from 'next';
import { Booked } from '@/features/admin';

export const metadata: Metadata = { title: 'Booking' };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Booked projectId={projectId} />;
}
