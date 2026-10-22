import type { Metadata } from 'next';
import { DesignSystemView } from '@/features/design-system';

export const metadata: Metadata = { title: 'Design system' };

export default function Page() {
  return <DesignSystemView />;
}
