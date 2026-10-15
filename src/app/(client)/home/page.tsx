import type { Metadata } from 'next';
import { ClientHome } from '@/features/goal-chat';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  return <ClientHome />;
}
