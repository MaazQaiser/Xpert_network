'use client';

import type { ReactNode } from 'react';
import { RoleShell } from '@/features/app-shell';
import { routes } from '@/shared/config/routes';
import { useScioConversations } from '../../api/queries';
import { ChatNavMenu } from './ChatNavMenu';

// How many recent Scio chats are listed under Home.
const RECENT_CHATS = 8;

/**
 * The admin console's shell, with the recent Scio chats listed under Home in the side nav, each
 * with a ⋯ menu to rename or delete it.
 */
export function AdminConsoleShell({ children }: { children: ReactNode }) {
  const chats = useScioConversations();
  const recent = (chats.data ?? []).slice(0, RECENT_CHATS).map((chat) => ({
    href: routes.admin.homeChat(chat.id),
    label: chat.title,
    actions: <ChatNavMenu chat={chat} />,
  }));
  return (
    <RoleShell role="admin" navChildren={{ [routes.admin.home]: recent }}>
      {children}
    </RoleShell>
  );
}
