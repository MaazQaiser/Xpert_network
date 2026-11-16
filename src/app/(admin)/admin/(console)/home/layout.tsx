import type { ReactNode } from 'react';
import { AdminHome } from '@/features/admin';

/**
 * Home and its saved chats (/admin/home/chat/<id>) share one Home, kept here so it stays mounted
 * when a new chat gets its address after the first question (its answer keeps streaming).
 */
export default function AdminHomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminHome />
      {children}
    </>
  );
}
