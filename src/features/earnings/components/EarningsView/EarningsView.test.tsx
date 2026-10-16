import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { EarningsView } from './EarningsView';

describe('EarningsView (F10)', () => {
  it('shows totals and requests a payout', async () => {
    const { container } = renderWithProviders(<EarningsView />, { persona: 'sara' });
    expect(await screen.findByText('Available to pay out')).toBeInTheDocument();
    const totals = screen.getByRole('region', { name: 'Totals' });
    expect(within(totals).getAllByText('$200')[0]).toBeInTheDocument();
    expect(screen.getByText('Coffee roaster capacity in Riyadh')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(within(totals).getByRole('button', { name: 'Request payout' }));
    const dialog = await screen.findByRole('dialog', { name: 'Request a payout of $200?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request payout' }));
    expect(await screen.findByText('Payout requested')).toBeInTheDocument();
    expect(within(totals).getByRole('button', { name: 'Request payout' })).toBeDisabled();
  });

  it('validates the payout method for the chosen kind', async () => {
    renderWithProviders(<EarningsView />, { persona: 'sara' });
    await userEvent.click(await screen.findByRole('button', { name: 'Change' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change payout method' });
    await userEvent.type(within(dialog).getByLabelText('IBAN'), '1234');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save payout method' }));
    expect(await within(dialog).findByText(/Enter an IBAN like/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByText('PayPal'));
    await userEvent.type(
      within(dialog).getByLabelText('PayPal email'),
      'sara.almansouri@mail.example',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save payout method' }));
    const method = await screen.findByRole('region', { name: 'Payout method' });
    expect(await within(method).findByText(/PayPal · s•••@mail.example/)).toBeInTheDocument();
  });

  it('starts new experts at open calls', async () => {
    setControls({ emptyData: true });
    renderWithProviders(<EarningsView />, { persona: 'sara' });
    expect(await screen.findByRole('heading', { name: 'No earnings yet' })).toBeInTheDocument();
  });
});
