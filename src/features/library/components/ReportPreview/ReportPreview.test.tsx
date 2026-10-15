import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ReportPreview } from './ReportPreview';

describe('ReportPreview (F3)', () => {
  it('confirms, buys and opens the report', async () => {
    const { container } = renderWithProviders(
      <ThemeProvider>
        <ReportPreview itemId="lib_riyadh_cafe_supply" />
      </ThemeProvider>,
      {
        persona: 'bilal',
      },
    );
    expect(await screen.findByRole('heading', { name: 'What’s inside' })).toBeInTheDocument();
    expect(screen.getByText('Who you’ll hear from')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const aside = screen.getByRole('complementary', { name: 'Price and purchase' });
    await userEvent.click(
      await within(aside).findByRole('button', { name: 'Buy for 150 credits' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('270 credits')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buy for 150 credits' }));

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/library/lib_riyadh_cafe_supply/read?purchased=1',
      ),
    );
    expect(db.get().ownedReports.usr_bilal).toContain('lib_riyadh_cafe_supply');
  });

  it('offers a top-up instead when the balance is short', async () => {
    setControls({ lowCredits: true });
    renderWithProviders(
      <ThemeProvider>
        <ReportPreview itemId="lib_qahwa_ops" />
      </ThemeProvider>,
      { persona: 'bilal' },
    );
    expect(await screen.findByText('Not enough credits')).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Choose a credit pack' })).toBeInTheDocument();
    const aside = screen.getByRole('complementary', { name: 'Price and purchase' });
    expect(within(aside).queryByRole('button', { name: /^Buy for/ })).not.toBeInTheDocument();
  });
});
