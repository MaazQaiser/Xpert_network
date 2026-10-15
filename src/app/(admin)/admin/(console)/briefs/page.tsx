import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Briefs and quotes' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Briefs and quotes"
      flow="F13 · Brief to quote"
      phase={6}
      description="confirmed briefs, coverage and the AI-drafted quote builder."
    />
  );
}
