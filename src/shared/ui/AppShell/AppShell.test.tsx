import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Email, Home } from '@carbon/icons-react';
import { mockLocation } from '@/test/navigation';
import { AppShell } from './AppShell';

const NAV = [
  {
    href: '/admin/home',
    label: 'Home',
    icon: Home,
    children: [
      { href: '/admin/home/chat/chat_a', label: 'New briefs update' },
      {
        href: '/admin/home/chat/chat_b',
        label: 'Coffee brief summary',
        actions: <button type="button">Options for Coffee brief summary</button>,
      },
    ],
  },
  { href: '/admin/inbox', label: 'Inbox', icon: Email },
];

describe('AppShell side nav', () => {
  it('lists links under an item, and marks an open one instead of its parent', () => {
    mockLocation.pathname = '/admin/home/chat/chat_b';
    render(
      <AppShell homeHref="/admin/home" navItems={NAV}>
        <p>Page</p>
      </AppShell>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Home',
      'New briefs update',
      'Coffee brief summary',
      'Inbox',
    ]);
    expect(within(nav).getByRole('link', { name: 'Coffee brief summary' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    // A row's actions sit beside its link, in the same list item.
    const options = within(nav).getByRole('button', { name: 'Options for Coffee brief summary' });
    const chat = within(nav).getByRole('link', { name: 'Coffee brief summary' });
    expect(options.closest('li')).toBe(chat.closest('li'));
  });

  it('marks Home on Home itself', () => {
    mockLocation.pathname = '/admin/home';
    render(
      <AppShell homeHref="/admin/home" navItems={NAV}>
        <p>Page</p>
      </AppShell>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'New briefs update' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
