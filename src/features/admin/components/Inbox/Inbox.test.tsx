import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
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
    await userEvent.click(await screen.findByRole('button', { name: /Needs client info/ }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/admin/inbox?view=client_info', {
      scroll: false,
    });
  });

  it('shows only the matching emails for a view', async () => {
    mockLocation.search = 'view=client_info';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Requests' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Needs client info/ })).toHaveAttribute(
      'aria-pressed',
      'true',
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
