import type { Metadata } from 'next';
import { CompaniesList } from '@/features/companies';

export const metadata: Metadata = { title: 'Companies' };

export default function CompaniesPage() {
  return <CompaniesList />;
}
