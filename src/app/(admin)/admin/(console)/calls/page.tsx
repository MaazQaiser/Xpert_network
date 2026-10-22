import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Calls' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Calls"
      flow="F16 · Call workspace (screen 16)"
      phase={6}
      description="booked calls with live transcripts, detected client requests and after-call documents."
    />
  );
}
