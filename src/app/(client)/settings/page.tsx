import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Settings"
      flow="F17 · Profile and settings"
      phase={1}
      description="profile, notification preferences, security and theme."
    />
  );
}
