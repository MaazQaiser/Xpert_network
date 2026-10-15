'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Header,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Theme,
} from '@carbon/react';
import styles from './AppShell.module.scss';

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType;
};

export type AppShellProps = {
  /** Shown after "Proptyop", e.g. "Admin". */
  productSuffix?: string;
  homeHref: string;
  /** Empty for focused tasks such as onboarding: no menu button, no side nav. */
  navItems: NavItem[];
  /** HeaderGlobalAction buttons (theme, notifications, user). */
  headerActions?: ReactNode;
  /** Rendered after the header — header panels, banners. */
  headerExtras?: ReactNode;
  /** Built-in Carbon theme for the header and side nav (admin's dark console). Default: the app theme. */
  chromeTheme?: 'g100';
  children: ReactNode;
};

/** Carbon UI Shell: header + side nav + main landmark, in the app theme (DESIGN_SYSTEM §3, §5). */
export function AppShell({
  productSuffix,
  homeHref,
  navItems,
  headerActions,
  headerExtras,
  chromeTheme,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const hasNav = navItems.length > 0;

  const chrome = (
    <>
      <SkipToContent href="#main-content" />
      {hasNav ? (
        <HeaderMenuButton
          aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
          isActive={isNavOpen}
          aria-expanded={isNavOpen}
          onClick={() => setIsNavOpen((open) => !open)}
        />
      ) : null}
      <HeaderName as={Link} href={homeHref} prefix="">
        Proptyop
        {productSuffix ? <span className={styles.suffix}>&nbsp;{productSuffix}</span> : null}
      </HeaderName>
      <HeaderGlobalBar>{headerActions}</HeaderGlobalBar>
      {hasNav ? (
        <SideNav
          aria-label="Main navigation"
          expanded={isNavOpen}
          onOverlayClick={() => setIsNavOpen(false)}
          href={homeHref}
        >
          <SideNavItems>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SideNavLink
                  key={item.href}
                  as={Link}
                  href={item.href}
                  renderIcon={item.icon}
                  isActive={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsNavOpen(false)}
                >
                  {item.label}
                </SideNavLink>
              );
            })}
          </SideNavItems>
        </SideNav>
      ) : null}
    </>
  );

  return (
    <>
      {chromeTheme ? (
        <Theme as={Header} theme={chromeTheme} aria-label="Proptyop">
          {chrome}
        </Theme>
      ) : (
        <Header aria-label="Proptyop">{chrome}</Header>
      )}
      {headerExtras}
      <main id="main-content" className={hasNav ? styles.content : styles.contentFull}>
        {children}
      </main>
    </>
  );
}
