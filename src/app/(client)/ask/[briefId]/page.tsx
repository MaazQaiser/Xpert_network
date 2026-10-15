import type { Metadata } from 'next';
import { GoalChat, goalTypeSchema } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'Research brief' };

type BriefPageProps = {
  params: Promise<{ briefId: string }>;
  searchParams: Promise<{ goal?: string | string[] }>;
};

export default async function BriefPage({ params, searchParams }: BriefPageProps) {
  const { briefId } = await params;
  const goal = goalTypeSchema.safeParse((await searchParams).goal);
  return <GoalChat briefId={briefId} initialGoal={goal.success ? goal.data : null} />;
}
