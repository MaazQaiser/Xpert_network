import type { Metadata } from 'next';
import { StartBrief } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'New research brief' };

export default function AskPage() {
  return <StartBrief />;
}
