import type { Metadata } from 'next';
import { KnowledgeBase } from '@/features/admin';

export const metadata: Metadata = { title: 'Knowledge base' };

export default function Page() {
  return <KnowledgeBase />;
}
