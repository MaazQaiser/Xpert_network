import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { WalletOverview } from './WalletOverview';

describe('WalletOverview (F6)', () => {
  it('shows available, held and monthly spend, and the history newest first', async () => {
    const { container } = renderWithProviders(<WalletOverview />, { persona: 'ayesha' });
    const balance = await screen.findByRole('region', { name: 'Balance' });
    expect(within(balance).getByText('390 credits')).toBeInTheDocument();
    expect(within(balance).getByText('0 credits')).toBeInTheDocument();

    const table = await screen.findByRole('table', { name: 'Transactions' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(5); // header + 2 top-ups + 2 purchases
    expect(rows[1]).toHaveTextContent('UAE consumer retail');
    await expectNoAxeViolations(container);
  });

  it('buys a credit pack through the mock checkout', async () => {
    renderWithProviders(<WalletOverview />, { persona: 'ayesha' });
    await userEvent.click(await screen.findByText('Starter'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));

    const dialog = await screen.findByRole('dialog', { name: 'Checkout' });
    expect(within(dialog).getByText('590 credits')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pay $1,000' }));

    expect(await screen.findByText('200 credits added')).toBeInTheDocument();
    expect(db.get().wallets.usr_ayesha!.balance).toBe(590);
    expect(db.get().wallets.usr_ayesha!.transactions[0]).toMatchObject({
      type: 'top_up',
      amount: 200,
    });
  });

  it('filters the history by type and offers a way back', async () => {
    renderWithProviders(<WalletOverview />, { persona: 'ayesha' });
    await screen.findByRole('table', { name: 'Transactions' });
    await userEvent.click(screen.getByRole('combobox', { name: /Show/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Refund' }));
    expect(await screen.findByText(/No refund transactions yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByRole('table', { name: 'Transactions' })).toBeInTheDocument();
  });

  it('shows empty and error states', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<WalletOverview />, { persona: 'bilal' });
    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    unmount();

    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<WalletOverview />, { persona: 'bilal' });
    await waitFor(() => expect(screen.getByText('Your wallet didn’t load')).toBeInTheDocument());
  });
});
