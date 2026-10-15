import type { Metadata } from 'next';
import { SettingsView } from '@/features/profile';

export const metadata: Metadata = { title: 'Profile and settings' };

export default function Page() {
  return <SettingsView role="expert" />;
}
