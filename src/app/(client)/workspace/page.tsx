import type { Metadata } from 'next';
import { WorkspaceBrowser } from '@/features/workspace';

export const metadata: Metadata = { title: 'Workspace' };

export default function Page() {
  return <WorkspaceBrowser />;
}
