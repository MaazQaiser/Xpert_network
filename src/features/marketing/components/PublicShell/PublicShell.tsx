'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Header,
  HeaderGlobalBar,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  SkipToContent,
  Theme,
} from '@carbon/react';
import { ThemeToggle } from '@/providers/ThemeToggle';
import styles from './PublicShell.module.scss';

type PublicShellProps = {
  children: ReactNode;
  /** Admin login uses the same frame with an "Admin" label. */
  variant?: 'public' | 'admin';
};

/** Header for public and login pages; no side nav. */
export function PublicShell({ children, variant = 'public' }: PublicShellProps) {
  const chrome = (
    <>
      <SkipToContent href="#main-content" />
      <HeaderName as={Link} href="/" prefix="">
        Xpert Network
        {variant === 'admin' ? <span className={styles.suffix}>&nbsp;Admin</span> : null}
      </HeaderName>
      {variant === 'public' ? (
        <HeaderNavigation aria-label="Xpert Network">
          <HeaderMenuItem as={Link} href="/login">
            Log in
          </HeaderMenuItem>
          <HeaderMenuItem as={Link} href="/sign-up">
            Sign up
          </HeaderMenuItem>
        </HeaderNavigation>
      ) : null}
      <HeaderGlobalBar>
        <ThemeToggle />
      </HeaderGlobalBar>
    </>
  );

  return (
    <>
      {/* The admin realm keeps a dark header so staff always know where they are (F0, F11). */}
      {variant === 'admin' ? (
        <Theme as={Header} theme="g100" aria-label="Xpert Network">
          {chrome}
        </Theme>
      ) : (
        <Header aria-label="Xpert Network" className={styles.header}>
          {chrome}
        </Header>
      )}
      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </>
  );
}
