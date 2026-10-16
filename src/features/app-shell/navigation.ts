import {
  Catalog,
  ChartLineData,
  CheckmarkOutline,
  Dashboard,
  Folders,
  Home,
  Money,
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
    { href: routes.client.requests, label: 'Requests', icon: RequestQuote },
    { href: routes.client.workspace, label: 'Workspace', icon: Folders },
    { href: routes.client.wallet, label: 'Wallet', icon: Wallet },
    { href: routes.client.settings, label: 'Settings', icon: Settings },
  ],
  expert: [
    { href: routes.expert.home, label: 'Home', icon: Home },
    { href: routes.expert.calls, label: 'Open calls', icon: Microphone },
    { href: routes.expert.earnings, label: 'Earnings', icon: Money },
    { href: routes.expert.profile, label: 'Profile', icon: UserAvatar },
  ],
  admin: [
    { href: routes.admin.dashboard, label: 'Dashboard', icon: Dashboard },
    { href: routes.admin.briefs, label: 'Briefs & quotes', icon: RequestQuote },
    { href: routes.admin.experts, label: 'Experts', icon: UserMultiple },
    { href: routes.admin.interviews, label: 'Interview checks', icon: CheckmarkOutline },
    { href: routes.admin.finance, label: 'Finance', icon: ChartLineData },
  ],
};
