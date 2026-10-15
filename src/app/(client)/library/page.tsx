import type { Metadata } from 'next';
import { LibraryBrowser } from '@/features/library';

export const metadata: Metadata = { title: 'Library' };

export default function LibraryPage() {
  return <LibraryBrowser />;
}
