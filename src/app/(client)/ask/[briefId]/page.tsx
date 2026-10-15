import type { Metadata } from 'next';
import { GoalChat } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'Research brief' };

export default async function BriefPage({ params }: { params: Promise<{ briefId: string }> }) {
  const { briefId } = await params;
  return <GoalChat briefId={briefId} />;
}
