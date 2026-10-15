import type { ReactNode } from 'react';
import { RoleShell } from '@/features/app-shell';

export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="admin">{children}</RoleShell>;
}
