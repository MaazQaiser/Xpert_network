import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Workspace' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Workspace"
      flow="F5 · Workspace"
      phase={4}
      description="folders, labels, pins and search across your briefs, reports and requests."
    />
  );
}
