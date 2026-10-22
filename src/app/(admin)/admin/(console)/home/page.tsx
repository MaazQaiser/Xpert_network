import type { Metadata } from 'next';
import { AdminHome } from '@/features/admin';

export const metadata: Metadata = { title: 'Home' };

export default function Page() {
  return <AdminHome />;
}
