import type { ReactNode } from 'react';
import { AdminConsoleShell } from '@/features/admin';

export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
