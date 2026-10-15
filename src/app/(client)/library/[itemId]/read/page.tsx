import type { Metadata } from 'next';
import { ReportViewer } from '@/features/library';

export const metadata: Metadata = { title: 'Reading a report' };

export default async function ReportReadPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return <ReportViewer itemId={itemId} />;
}
