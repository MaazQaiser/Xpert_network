import type { ReactNode } from 'react';
import { RoleShell } from '@/features/app-shell';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="client">{children}</RoleShell>;
}
