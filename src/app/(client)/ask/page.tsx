import type { Metadata } from 'next';
import { goalTypeSchema, StartBrief } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'New research brief' };

type AskPageProps = { searchParams: Promise<{ goal?: string | string[] }> };

/** `/ask?goal=expand` (from onboarding, F1) opens the chat with the goal already chosen. */
export default async function AskPage({ searchParams }: AskPageProps) {
  const goal = goalTypeSchema.safeParse((await searchParams).goal);
  return <StartBrief goal={goal.success ? goal.data : null} />;
}
