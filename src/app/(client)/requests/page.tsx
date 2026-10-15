import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Requests' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Requests"
      flow="F4 · Custom research"
      phase={4}
      description="quotes, status tracking and delivery for your custom research requests."
    />
  );
}
