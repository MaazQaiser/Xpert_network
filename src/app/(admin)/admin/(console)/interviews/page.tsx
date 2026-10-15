import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Interview checks' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Interview checks"
      flow="F15 · Interview check"
      phase={6}
      description="transcripts, flagged passages, redaction and accept or reject."
    />
  );
}
