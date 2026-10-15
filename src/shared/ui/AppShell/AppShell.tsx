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
  navItems: NavItem[];
  /** HeaderGlobalAction buttons (theme, notifications, user). */
  headerActions?: ReactNode;
  /** Rendered after the header — header panels, banners. */
  headerExtras?: ReactNode;
  children: ReactNode;
};

/** Carbon UI Shell: g100 header + side nav + main landmark (DESIGN_SYSTEM §3, §5). */
export function AppShell({
  productSuffix,
  homeHref,
  navItems,
  headerActions,
  headerExtras,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <>
      <Theme as={Header} theme="g100" aria-label="Proptyop">
        <SkipToContent href="#main-content" />
        <HeaderMenuButton
          aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
          isActive={isNavOpen}
          aria-expanded={isNavOpen}
          onClick={() => setIsNavOpen((open) => !open)}
        />
        <HeaderName as={Link} href={homeHref} prefix="">
          Proptyop{productSuffix ? <span className={styles.suffix}>&nbsp;{productSuffix}</span> : null}
        </HeaderName>
        <HeaderGlobalBar>{headerActions}</HeaderGlobalBar>
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
      </Theme>
      {headerExtras}
      <main id="main-content" className={styles.content}>
        {children}
      </main>
    </>
  );
}
