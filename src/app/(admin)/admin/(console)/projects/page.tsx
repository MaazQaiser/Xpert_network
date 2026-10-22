import type { Metadata } from 'next';
import { ProjectsList } from '@/features/admin';

export const metadata: Metadata = { title: 'Projects' };

export default function Page() {
  return <ProjectsList />;
}
