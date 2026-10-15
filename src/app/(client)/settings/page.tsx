import type { Metadata } from 'next';
import { SettingsView } from '@/features/profile';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return <SettingsView role="client" />;
}
