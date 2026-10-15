import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Library' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Library"
      flow="F3 · Library"
      phase={3}
      description="search, category shelves, report previews and purchase with credits."
    />
  );
}
