import type { ReactNode } from 'react';
import { PublicShell } from '@/features/marketing';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
