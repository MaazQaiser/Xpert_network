import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Expert home' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Expert home"
      flow="F7 · Expert onboarding"
      phase={1}
      description="your approval status, open calls that match you and upcoming interviews."
    />
  );
}
