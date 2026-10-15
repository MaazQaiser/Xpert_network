import type { Metadata } from 'next';
import { RequestsList } from '@/features/custom-requests';

export const metadata: Metadata = { title: 'Requests' };

export default function RequestsPage() {
  return <RequestsList />;
}
