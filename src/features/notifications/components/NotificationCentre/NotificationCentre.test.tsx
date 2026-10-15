import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { NotificationCentre } from './NotificationCentre';

describe('NotificationCentre (F17)', () => {
  it('shows the unread count, opens a notification and marks it read', async () => {
    const { container } = renderWithProviders(
      <NotificationCentre settingsHref="/settings?tab=notifications" />,
      { persona: 'ayesha' },
    );
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await userEvent.click(bell);

    const list = await screen.findByRole('list', { name: 'Notifications' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    await expectNoAxeViolations(container);

    await userEvent.click(within(list).getByRole('button', { name: /New report matches/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/library');
    await waitFor(() => expect(db.get().notifications.usr_ayesha?.every((n) => n.read)).toBe(true));
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('marks everything as read', async () => {
    renderWithProviders(<NotificationCentre />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('shows the empty and error states', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<NotificationCentre />, { persona: 'sara' });
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('You’re all caught up')).toBeInTheDocument();
    unmount();

    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<NotificationCentre />, { persona: 'sara' });
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('Notifications didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
