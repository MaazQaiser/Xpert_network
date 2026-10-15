import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SettingsView } from './SettingsView';

const renderSettings = (tab: string, role: 'client' | 'expert' = 'client') => {
  mockLocation.pathname = role === 'client' ? '/settings' : '/expert/profile';
  mockLocation.search = `?tab=${tab}`;
  return renderWithProviders(
    <ThemeProvider>
      <SettingsView role={role} />
    </ThemeProvider>,
    { persona: role === 'client' ? 'bilal' : 'sara' },
  );
};

describe('SettingsView (F17)', () => {
  it('saves profile details and keeps the tab in the URL', async () => {
    const { container } = renderSettings('profile');
    const name = await screen.findByLabelText('Full name');
    expect(name).toHaveValue('Bilal Haddad');
    await expectNoAxeViolations(container);

    await userEvent.clear(screen.getByLabelText('Phone (optional)'));
    await userEvent.type(screen.getByLabelText('Phone (optional)'), '0551234');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText(/Use international format/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Phone (optional)'));
    await userEvent.type(screen.getByLabelText('Phone (optional)'), '+966 55 123 4567');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(db.get().profiles.usr_bilal?.phone).toBe('+966 55 123 4567');

    await userEvent.click(screen.getByRole('tab', { name: 'Security' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/settings?tab=security', { scroll: false });
  });

  it('saves notification preferences per channel', async () => {
    renderSettings('notifications');
    const quotes = await screen.findByRole('group', { name: 'Quotes' });
    await userEvent.click(within(quotes).getByText('Email'));
    await userEvent.click(screen.getByText('Daily summary (08:00)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save notification settings' }));

    expect(await screen.findByText('Notification settings saved')).toBeInTheDocument();
    const prefs = db.get().preferences.usr_bilal!;
    expect(prefs.digest).toBe('daily');
    expect(prefs.channels.find((c) => c.event === 'quote_ready')).toMatchObject({
      email: false,
      inApp: true,
    });
  });

  it('signs out another session and turns on two-step verification', async () => {
    const { container } = renderSettings('security');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out Safari on iPhone' }));
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument());
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('switch', { name: /Require a code at log in/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('6-digit code'), '482913');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn on' }));
    await waitFor(() => expect(db.get().security.usr_bilal?.twoFactorEnabled).toBe(true));
  });

  it('shows the read-only expert profile first for experts', async () => {
    renderSettings('expertise', 'expert');
    expect(await screen.findByRole('heading', { name: 'Your expert profile' })).toBeInTheDocument();
    expect(await screen.findByText('Procurement & sourcing')).toBeInTheDocument();
  });
});
