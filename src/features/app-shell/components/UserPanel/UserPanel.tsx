'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, HeaderPanel } from '@carbon/react';
import { ChevronDown, Logout } from '@carbon/icons-react';
import { useLogout, ROLE_LOGIN, type User } from '@/features/auth';
import styles from './UserPanel.module.scss';

const ROLE_LABEL = { client: 'Client', expert: 'Expert', admin: 'Super admin' } as const;

// Placeholder portraits for the demo accounts (randomuser.me, saved in /public/images/avatars).
// Accounts created through sign-up have no persona, so they keep their initials.
const PERSONA_PHOTOS: Record<string, string> = {
  ops: '/images/avatars/palto-kersion.jpg',
  ayesha: '/images/avatars/ayesha-rahman.jpg',
  bilal: '/images/avatars/bilal-haddad.jpg',
  sara: '/images/avatars/sara-almansouri.jpg',
};

/** The user's photo or, without one, their initials, in a circle. */
function Avatar({ user, size }: { user: User; size: 'md' | 'lg' }) {
  const photo = user.personaId ? PERSONA_PHOTOS[user.personaId] : undefined;
  const px = size === 'lg' ? 48 : 32;
  return (
    <span className={size === 'lg' ? styles.avatarLarge : styles.avatar} aria-hidden="true">
      {photo ? (
        <Image src={photo} alt="" width={px} height={px} className={styles.avatarPhoto} />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

/** "Palto Kersion" → "PK": the first letters of the first and last names. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function UserPanel({ user, settingsHref }: { user: User; settingsHref?: string }) {
  const router = useRouter();
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* The account trigger: avatar, name and designation, sized and styled as a Carbon header
          action (it carries Carbon's header-action class, so hover, focus and the active state
          match the icon buttons beside it). Phones show the avatar only. */}
      <button
        type="button"
        className={`cds--header__action ${styles.trigger} ${isOpen ? 'cds--header__action--active' : ''}`}
        aria-label={`Account: ${user.name}, ${user.title}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Avatar user={user} size="md" />
        <span className={styles.identity} aria-hidden="true">
          <span className={styles.triggerName}>{user.name}</span>
          <span className={styles.triggerTitle}>{user.title}</span>
        </span>
        <ChevronDown className={styles.chevron} aria-hidden={true} />
      </button>
      <HeaderPanel expanded={isOpen} onHeaderPanelFocus={() => setIsOpen(false)}>
        {/* Rendered only while open, so closed-panel links aren't in the tab order. */}
        {isOpen ? (
          <section className={styles.panel} aria-label="Account">
            <Avatar user={user} size="lg" />
            <p className={styles.name}>{user.name}</p>
            <p className={styles.meta}>{user.title}</p>
            <p className={styles.meta}>
              {user.organisation} · {ROLE_LABEL[user.role]}
            </p>
            {settingsHref ? (
              <Link
                href={settingsHref}
                className={styles.settings}
                onClick={() => setIsOpen(false)}
              >
                Profile and settings
              </Link>
            ) : null}
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
          </section>
        ) : null}
      </HeaderPanel>
    </>
  );
}
