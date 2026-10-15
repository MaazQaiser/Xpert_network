import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Profile' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Profile"
      flow="F17 · Profile and settings"
      phase={1}
      description="your expertise, regions, compliance attestations and payout method."
    />
  );
}
