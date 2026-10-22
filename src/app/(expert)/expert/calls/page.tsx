import type { Metadata } from 'next';
import { CallsBrowser } from '@/features/open-calls';

export const metadata: Metadata = { title: 'Interview requests' };

export default function Page() {
  return <CallsBrowser />;
}
