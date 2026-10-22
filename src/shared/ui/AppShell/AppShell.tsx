'use client';

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';
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
import { Menu } from '@carbon/icons-react';
import { useBreakpointUp } from '../../hooks/useMediaQuery';
import styles from './AppShell.module.scss';

// Desktop nav collapse is a per-viewer convenience, remembered in this browser.
const NAV_COLLAPSED_KEY = 'xn.sideNavCollapsed';
const navListeners = new Set<() => void>();

function readNavCollapsed(): boolean {
  try {
    return window.localStorage.getItem(NAV_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function subscribeNavCollapsed(listener: () => void) {
  navListeners.add(listener);
  return () => navListeners.delete(listener);
}

function writeNavCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(NAV_COLLAPSED_KEY, String(value));
  } catch {
    // Storage unavailable (private mode): the state just won't persist.
  }
  navListeners.forEach((listener) => listener());
}

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType;
  /** Other path prefixes that belong to this item, e.g. Home owns the goal chats under /ask. */
  activeFor?: string[];
};

export type AppShellProps = {
  /** Shown after "Xpert Network", e.g. "Admin". */
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
  // Below lg the nav is an overlay; at lg+ it's docked and the same button collapses it.
  const [isNavOpen, setIsNavOpen] = useState(false);
  const isDesktop = useBreakpointUp('lg');
  const isCollapsed = useSyncExternalStore(subscribeNavCollapsed, readNavCollapsed, () => false);
  const hasNav = navItems.length > 0;
  const isNavShown = isDesktop ? !isCollapsed : isNavOpen;
  const toggleNav = useCallback(() => {
    if (isDesktop) writeNavCollapsed(!isCollapsed);
    else setIsNavOpen((open) => !open);
  }, [isDesktop, isCollapsed]);

  const chrome = (
    <>
      <SkipToContent href="#main-content" />
      {hasNav ? (
        <HeaderMenuButton
          className={styles.menuButton}
          aria-label={isNavShown ? 'Hide navigation' : 'Show navigation'}
          aria-controls="main-navigation"
          isActive={isNavShown}
          isCollapsible
          // Docked nav: a hamburger toggle in both states (the X is for the mobile overlay).
          {...(isDesktop ? { renderCloseIcon: <Menu size={20} /> } : {})}
          aria-expanded={isNavShown}
          onClick={toggleNav}
        />
      ) : null}
      <HeaderName as={Link} href={homeHref} prefix="">
        Xpert Network
        {productSuffix ? <span className={styles.suffix}>&nbsp;{productSuffix}</span> : null}
      </HeaderName>
      <HeaderGlobalBar>{headerActions}</HeaderGlobalBar>
      {hasNav ? (
        <SideNav
          id="main-navigation"
          className={[
            chromeTheme ? undefined : styles.sideNav,
            isDesktop && isCollapsed ? styles.sideNavCollapsed : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Main navigation"
          expanded={isNavOpen}
          onOverlayClick={() => setIsNavOpen(false)}
          href={homeHref}
        >
          <SideNavItems>
            {navItems.map((item) => {
              const isActive = [item.href, ...(item.activeFor ?? [])].some(
                (path) => pathname === path || pathname.startsWith(`${path}/`),
              );
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
        <Theme as={Header} theme={chromeTheme} aria-label="Xpert Network">
          {chrome}
        </Theme>
      ) : (
        <Header aria-label="Xpert Network" className={styles.header}>
          {chrome}
        </Header>
      )}
      {headerExtras}
      <main
        id="main-content"
        className={
          !hasNav || (isDesktop && isCollapsed)
            ? styles.contentFull
            : chromeTheme
              ? styles.content
              : styles.contentFloating
        }
      >
        {children}
      </main>
    </>
  );
}
