'use client';

import type { ReactNode } from 'react';
import { RequireRole, ROLE_HOME, type Role } from '@/features/auth';
import { OnboardingGate } from '@/features/onboarding';
import { BalanceBadge } from '@/features/wallet';
import { ThemeToggle } from '@/providers/ThemeToggle';
import { AppShell } from '@/shared/ui';
import { NAVIGATION } from '../../navigation';
import { LowBalanceBanner } from '../LowBalanceBanner/LowBalanceBanner';
import { UserPanel } from '../UserPanel/UserPanel';
import styles from './RoleShell.module.scss';

const SUFFIX: Record<Role, string | undefined> = {
  client: undefined,
  expert: 'for experts',
  admin: 'Admin',
};

/** The guarded shell for one role: header, side nav, role-specific header actions. */
export function RoleShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <RequireRole role={role}>
      {(user) => (
        <OnboardingGate role={role}>
          {(isFocused) => (
            <AppShell
              {...(SUFFIX[role] ? { productSuffix: SUFFIX[role] } : {})}
              homeHref={ROLE_HOME[role]}
              navItems={isFocused ? [] : NAVIGATION[role]}
              headerActions={
                <>
                  {role === 'client' && !isFocused ? <BalanceBadge /> : null}
                  <ThemeToggle />
                  <UserPanel user={user} />
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
