import type { Metadata } from 'next';
import { ConfirmAvailability } from '@/features/admin';

export const metadata: Metadata = { title: 'Confirm availability' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ experts?: string }>;
}) {
  const { projectId } = await params;
  const { experts } = await searchParams;
  return (
    <ConfirmAvailability
      projectId={projectId}
      expertIds={experts ? experts.split(',').filter(Boolean) : []}
    />
  );
}
