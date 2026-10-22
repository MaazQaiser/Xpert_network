import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Clients' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Clients"
      flow="F20 · Clients (screen 27)"
      phase={6}
      description="client cards with contacts, email domains, compliance rules and active projects."
    />
  );
}
