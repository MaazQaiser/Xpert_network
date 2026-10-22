import {
  Bullhorn,
  Calendar,
  Catalog,
  Email,
  Enterprise,
  Folders,
  Home,
  Money,
  Phone,
  RequestQuote,
  Settings,
  UserAvatar,
  UserMultiple,
  Wallet,
  Microphone,
} from '@carbon/icons-react';
import type { Role } from '@/features/auth';
import type { NavItem } from '@/shared/ui';
import { routes } from '@/shared/config/routes';

export const NAVIGATION: Record<Role, NavItem[]> = {
  client: [
    // Home is where research starts and continues: the goal chats under /ask belong to it.
    { href: routes.client.home, label: 'Home', icon: Home, activeFor: [routes.client.ask] },
    { href: routes.client.library, label: 'Library', icon: Catalog },
    { href: routes.client.companies, label: 'Companies', icon: Enterprise },
    { href: routes.client.requests, label: 'Requests', icon: RequestQuote },
    { href: routes.client.workspace, label: 'Workspace', icon: Folders },
    { href: routes.client.wallet, label: 'Wallet', icon: Wallet },
    { href: routes.client.settings, label: 'Settings', icon: Settings },
  ],
  expert: [
    { href: routes.expert.home, label: 'Home', icon: Home },
    { href: routes.expert.calls, label: 'Interview requests', icon: Microphone },
    { href: routes.expert.earnings, label: 'Earnings', icon: Money },
    { href: routes.expert.profile, label: 'Profile', icon: UserAvatar },
  ],
  admin: [
    { href: routes.admin.home, label: 'Home', icon: Home },
    { href: routes.admin.inbox, label: 'Inbox', icon: Email },
    { href: routes.admin.projects, label: 'Projects', icon: Folders },
    { href: routes.admin.clients, label: 'Clients', icon: Enterprise },
    { href: routes.admin.experts, label: 'Experts', icon: UserMultiple },
    { href: routes.admin.outreach, label: 'Outreach', icon: Bullhorn },
    { href: routes.admin.scheduling, label: 'Scheduling', icon: Calendar },
    { href: routes.admin.calls, label: 'Calls', icon: Phone },
  ],
};
