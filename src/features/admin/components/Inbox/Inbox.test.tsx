import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { Inbox } from './Inbox';

describe('Inbox (F12, screen 02)', () => {
  it('lists client emails and shows what the AI did with the open one', async () => {
    const { container } = renderWithProviders(<Inbox selectedId="req_helix_ev" />, {
      persona: 'ops',
    });
    const list = await screen.findByRole('list', { name: 'Requests' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getByRole('link', { name: /Sarah Lin/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    const pane = screen.getByRole('article', { name: /EV battery recycling/ });
    expect(within(pane).getByRole('link', { name: 'Open project file' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042',
    );
    expect(within(pane).getByText('2 things need confirming:')).toBeInTheDocument();
    expect(within(pane).getByText('4 of 5 done')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('filters by view through the URL', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: /^Attachments/ }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/admin/inbox?view=attachments', {
      scroll: false,
    });
  });

  it('shows only unread emails, and opening one marks it read', async () => {
    mockLocation.search = 'view=unread';
    renderWithProviders(<Inbox selectedId="req_northgate_mro" />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Requests' });
    expect(screen.getByRole('button', { name: /^Unread/ })).toHaveAttribute('aria-pressed', 'true');
    // Two unread to start; opening Omar's email reads it.
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(db.get().adminInbox['req_northgate_mro']?.read).toBe(true);
  });

  it('shows only the emails of the chosen mailbox', async () => {
    mockLocation.search = 'account=partners%40xpertnetwork.example';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Requests' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
    expect(within(list).getByText('Mei Tanaka')).toBeInTheDocument();
  });

  it('connects another mailbox and switches to it', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Add another account' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Connect another mailbox')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByLabelText('Microsoft 365'));
    await userEvent.type(
      within(dialog).getByLabelText('Mailbox address'),
      'briefs@xpertnetwork.example',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Connect mailbox' }));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/admin/inbox?account=briefs%40xpertnetwork.example',
        { scroll: false },
      ),
    );
    expect(db.get().adminMailAccounts.map((a) => a.address)).toContain(
      'briefs@xpertnetwork.example',
    );
  });

  it('explains a password-protected file instead of opening it', async () => {
    renderWithProviders(<Inbox selectedId="req_corvid_fintech" />, { persona: 'ops' });
    expect(
      await screen.findByText(/is password-protected. We never try to open/),
    ).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    setControls({ emptyData: true });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByText('No client emails yet')).toBeInTheDocument();
  });
});
