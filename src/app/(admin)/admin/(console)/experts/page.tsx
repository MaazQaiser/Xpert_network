import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Experts' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Experts"
      flow="F20 · Experts directory (screen 26)"
      phase={6}
      description="the expert network with filters, duplicate detection and an edit panel."
    />
  );
}
