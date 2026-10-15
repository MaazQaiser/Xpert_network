import type { ReactNode } from 'react';
import { PublicShell } from '@/features/marketing';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
