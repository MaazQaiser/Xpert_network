import type { ReactNode } from 'react';
import { RoleShell } from '@/features/app-shell';

export default function ExpertLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="expert">{children}</RoleShell>;
}
