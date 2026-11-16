'use client';

import type { ReactNode } from 'react';
import { RequireRole, ROLE_HOME, type Role } from '@/features/auth';
import { NotificationCentre } from '@/features/notifications';
import { OnboardingGate } from '@/features/onboarding';
import { BalanceBadge } from '@/features/wallet';
import { ThemeToggle } from '@/providers/ThemeToggle';
import { AppShell, type NavSubItem } from '@/shared/ui';
import { NAVIGATION } from '../../navigation';
import { LowBalanceBanner } from '../LowBalanceBanner/LowBalanceBanner';
import { UserPanel } from '../UserPanel/UserPanel';
import styles from './RoleShell.module.scss';

/** F17 settings per role; admins have none yet. */
const SETTINGS: Record<Role, string | undefined> = {
  client: '/settings',
  expert: '/expert/profile',
  admin: undefined,
};

const SUFFIX: Record<Role, string | undefined> = {
  client: undefined,
  expert: 'for experts',
  admin: 'Admin',
};

/**
 * The guarded shell for one role: header, side nav, role-specific header actions.
 * `navChildren` adds links under nav items, by the item's href (e.g. recent chats under Home).
 */
export function RoleShell({
  role,
  navChildren,
  children,
}: {
  role: Role;
  navChildren?: Record<string, NavSubItem[]>;
  children: ReactNode;
}) {
  const navItems = NAVIGATION[role].map((item) =>
    navChildren?.[item.href] ? { ...item, children: navChildren[item.href] } : item,
  );
  return (
    <RequireRole role={role}>
      {(user) => (
        <OnboardingGate role={role}>
          {(isFocused) => (
            <AppShell
              {...(SUFFIX[role] ? { productSuffix: SUFFIX[role] } : {})}
              homeHref={ROLE_HOME[role]}
              navItems={isFocused ? [] : navItems}
              headerActions={
                <>
                  {role === 'client' && !isFocused ? <BalanceBadge /> : null}
                  {/* Phones: theme lives in Settings → Appearance, so the header fits. */}
                  <ThemeToggle className={styles.hideOnPhone} />
                  <NotificationCentre
                    {...(SETTINGS[role] && !isFocused
                      ? { settingsHref: `${SETTINGS[role]}?tab=notifications` }
                      : {})}
                  />
                  <UserPanel
                    user={user}
                    {...(SETTINGS[role] && !isFocused ? { settingsHref: SETTINGS[role] } : {})}
                  />
                </>
              }
            >
              <div className={styles.page}>
                {role === 'client' && !isFocused ? <LowBalanceBanner /> : null}
                {children}
              </div>
            </AppShell>
          )}
        </OnboardingGate>
      )}
    </RequireRole>
  );
}
