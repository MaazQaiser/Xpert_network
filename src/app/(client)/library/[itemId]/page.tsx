import type { Metadata } from 'next';
import { ReportPreview } from '@/features/library';

export const metadata: Metadata = { title: 'Report' };

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <ReportPreview itemId={itemId} />;
}
