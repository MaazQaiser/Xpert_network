'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, HeaderGlobalAction, HeaderPanel } from '@carbon/react';
import { Logout, UserAvatar } from '@carbon/icons-react';
import { useLogout, ROLE_LOGIN, type User } from '@/features/auth';
import styles from './UserPanel.module.scss';

const ROLE_LABEL = { client: 'Client', expert: 'Expert', admin: 'Super admin' } as const;

export function UserPanel({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <HeaderGlobalAction
        aria-label={`Account: ${user.name}`}
        aria-expanded={isOpen}
        isActive={isOpen}
        tooltipAlignment="end"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserAvatar size={20} />
      </HeaderGlobalAction>
      <HeaderPanel
        expanded={isOpen}
        aria-label="Account"
        onHeaderPanelFocus={() => setIsOpen(false)}
      >
        <div className={styles.panel}>
          <p className={styles.name}>{user.name}</p>
          <p className={styles.meta}>{user.title}</p>
          <p className={styles.meta}>
            {user.organisation} · {ROLE_LABEL[user.role]}
          </p>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Logout}
            className={styles.logout}
            onClick={() =>
              logout.mutate(undefined, { onSuccess: () => router.push(ROLE_LOGIN[user.role]) })
            }
          >
            Log out
          </Button>
        </div>
      </HeaderPanel>
    </>
  );
}
