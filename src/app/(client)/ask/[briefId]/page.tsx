import type { Metadata } from 'next';
import { GoalChat, goalTypeSchema } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'Research brief' };

type BriefPageProps = {
  params: Promise<{ briefId: string }>;
  searchParams: Promise<{ goal?: string | string[]; play?: string | string[] }>;
};

export default async function BriefPage({ params, searchParams }: BriefPageProps) {
  const { briefId } = await params;
  const query = await searchParams;
  const goal = goalTypeSchema.safeParse(query.goal);
  const play = query.play === '1' || (Array.isArray(query.play) && query.play.includes('1'));
  return (
    <GoalChat briefId={briefId} initialGoal={goal.success ? goal.data : null} autoPlay={play} />
  );
}
