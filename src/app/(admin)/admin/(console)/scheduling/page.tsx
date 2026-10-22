import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Scheduling' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Scheduling"
      flow="F15 · Availability and booking (screens 09–15)"
      phase={6}
      description="held slots, client picks and confirmed calls across projects."
    />
  );
}
