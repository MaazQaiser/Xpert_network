import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Open calls' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Open calls"
      flow="F8 · Open calls"
      phase={5}
      description="browse calls, check your match, answer screening questions and apply."
    />
  );
}
