import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { ExpertDetail } from './ExpertDetail';
import { Experts } from './Experts';

describe('Experts (F20)', () => {
  it('lists the network database, searches and filters it', async () => {
    const { container } = renderWithProviders(<Experts />, { persona: 'ops' });
    expect(
      await screen.findByText(/^\d+ vetted experts in the Xpert Network database$/),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Experts' });
    // Twenty to a page.
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    await expectNoAxeViolations(container);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search experts' }), 'Megan');
    expect(screen.getByRole('link', { name: 'Megan Price' })).toHaveAttribute(
      'href',
      '/admin/experts/exp_megan-price',
    );
    expect(screen.getByText(/1 of \d+ experts match/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    // The sector filter is searchable: typing narrows its options.
    await userEvent.type(screen.getByRole('combobox', { name: /Sector/ }), 'avi');
    expect(screen.getByRole('option', { name: /^Aviation & MRO/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Food & beverage/ })).toBeNull();
    await userEvent.click(screen.getByRole('option', { name: /^Aviation & MRO/ }));
    expect(screen.getByText(/of \d+ experts match/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Megan Price' })).toBeNull();
  });

  it('shows one expert’s record: career, projects and calls', async () => {
    const { container } = renderWithProviders(<ExpertDetail expertId="exp_megan-price" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', { name: 'Megan Price', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Former Operations Director, contract manufacturing'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Experience' })).toBeInTheDocument();
    const calls = screen.getByRole('region', { name: /Calls/ });
    expect(within(calls).getByRole('link', { name: /Halden Group/ })).toHaveAttribute(
      'href',
      '/admin/calls/mtg_live',
    );
    await expectNoAxeViolations(container);
  });

  it('says when an expert isn’t in the database', async () => {
    renderWithProviders(<ExpertDetail expertId="exp_nobody" />, { persona: 'ops' });
    expect(await screen.findByText('Expert not found')).toBeInTheDocument();
  });

  it('shows an empty state with no experts, and an error with retry', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<Experts />, { persona: 'ops' });
    expect(await screen.findByText('No experts in the database yet')).toBeInTheDocument();
    unmount();
    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<Experts />, { persona: 'ops' });
    expect(await screen.findByText('The expert database didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
