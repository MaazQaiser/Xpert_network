'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loading } from '@carbon/react';
import { useSession } from '../../api/useSession';
import { routes } from '@/shared/config/routes';
import { ROLE_HOME, ROLE_LOGIN, type Role, type User } from '../../model/session.schema';

type RequireRoleProps = {
  role: Role;
  children: (user: User) => ReactNode;
};

/**
 * Client-side role guard: the single seam where real auth plugs in later (ARCHITECTURE §6).
 * Wrong role → that role's home; no session → the right login; unverified email → the
 * verify-email notice.
 */
export function RequireRole({ role, children }: RequireRoleProps) {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user ?? null;
  const redirectTo = session.isPending
    ? null
    : !user
      ? ROLE_LOGIN[role]
      : user.role !== role
        ? ROLE_HOME[user.role]
        : !user.emailVerified
          ? routes.verifyEmail
          : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!user || user.role !== role || !user.emailVerified) {
    return <Loading description="Checking your session" withOverlay={false} />;
  }
  return <>{children(user)}</>;
}
