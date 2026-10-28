import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { Scheduling } from './Scheduling';

describe('Scheduling (F15)', () => {
  it('shows this week’s calls and opens one with its Google Meet link', async () => {
    const { container } = renderWithProviders(<Scheduling />, { persona: 'ops' });
    expect(
      await screen.findByText(/8 booked calls and 3 held slots this week/),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);

    // A booked call opens a small preview with Join and the guests.
    const [call] = screen.getAllByRole('button', { name: /^Booked call: / });
    await userEvent.click(call!);
    const preview = await screen.findByRole('dialog', { name: /^Expert call: / });
    const join = within(preview).getByRole('link', { name: /Join with Google Meet/ });
    expect(join).toHaveAttribute('href', expect.stringMatching(/^https:\/\/meet\.google\.com\//));
    expect(join).toHaveAttribute('target', '_blank');
    expect(within(preview).getByText('2 guests')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    // A held slot has no link yet; it says it is waiting on the client.
    const [held] = screen.getAllByRole('button', { name: /^Held slot: / });
    await userEvent.click(held!);
    const heldPreview = await screen.findByRole('dialog', { name: /^Held slot: / });
    expect(within(heldPreview).queryByRole('link', { name: /Join with Google Meet/ })).toBeNull();
    expect(within(heldPreview).getByText(/Awaiting .*’s pick/)).toBeInTheDocument();
  });

  it('filters by project and switches to the month and day views', async () => {
    renderWithProviders(<Scheduling />, { persona: 'ops' });
    await screen.findByText(/booked calls/);
    const before = screen.getAllByRole('button', { name: /^(Booked call|Held slot): / }).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /Specialty coffee sourcing/ }));
    expect(
      screen.getAllByRole('button', { name: /^(Booked call|Held slot): / }).length,
    ).toBeLessThan(before);
    expect(screen.queryByRole('button', { name: /Meridian Gulf Capital/ })).toBeNull();

    // The view menu on the right of the bar, as in Google Calendar.
    await userEvent.click(screen.getByRole('combobox', { name: /View/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Month' }));
    expect(screen.getByText(/this month/)).toBeInTheDocument();
    // A day's number opens that day.
    await userEvent.click(screen.getAllByRole('button', { name: /^Open / })[10]!);
    expect(screen.getByText(/today\.|No calls today/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /View/ })).toHaveTextContent('Day');

    // The side panel folds away for a wider calendar, and comes back.
    await userEvent.click(screen.getByRole('button', { name: 'Hide the side panel' }));
    expect(screen.queryByRole('complementary', { name: 'Calendar options' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show the side panel' }));
    expect(screen.getByRole('complementary', { name: 'Calendar options' })).toBeInTheDocument();
  });

  it('shows an empty state with no calls, and an error with retry', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<Scheduling />, { persona: 'ops' });
    expect(await screen.findByText('No calls scheduled yet')).toBeInTheDocument();
    unmount();
    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<Scheduling />, { persona: 'ops' });
    expect(await screen.findByText('Your calendar didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
