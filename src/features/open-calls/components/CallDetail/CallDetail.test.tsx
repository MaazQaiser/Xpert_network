import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { CallsBrowser } from '../CallsBrowser/CallsBrowser';
import { CallDetail } from './CallDetail';

describe('Open calls (F8)', () => {
  it('lists calls with match, fee and time, strongest first', async () => {
    mockLocation.pathname = '/expert/calls';
    const { container } = renderWithProviders(<CallsBrowser />, { persona: 'sara' });
    expect(await screen.findByRole('heading', { name: 'Interview requests' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Specialty coffee' })).toBeInTheDocument();
    const coffee = screen.getByRole('link', {
      name: 'Specialty coffee supply chains in Saudi Arabia',
    });
    expect(coffee).toHaveAttribute('href', '/expert/calls/call_ksa_coffee_supply/session');
    const first = coffee.closest('article');
    if (!first) throw new Error('Coffee request card was not found');
    expect(first).toHaveTextContent(
      'Category Procurement & sourcing · Supplier negotiation · Import lead times & customs',
    );
    expect(within(first).getByText('Strong match')).toBeInTheDocument();
    expect(within(first).getByText('$300')).toBeInTheDocument();
    expect(screen.getByText('Applied · under review')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('keeps filters in the URL and offers to clear them when nothing matches', async () => {
    mockLocation.pathname = '/expert/calls';
    mockLocation.search = '?minFee=300&maxMinutes=30';
    renderWithProviders(<CallsBrowser />, { persona: 'sara' });
    expect(
      await screen.findByRole('heading', { name: 'No requests match these filters' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(mockRouter.replace).toHaveBeenCalledWith('/expert/calls', { scroll: false });
  });

  it('applies with screening answers and lets a qualifying expert start', async () => {
    const { container } = renderWithProviders(<CallDetail callId="call_ksa_coffee_supply" />, {
      persona: 'sara',
    });
    expect(
      await screen.findByRole('heading', { name: 'Why you’re a strong match' }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findAllByText('Choose an answer.')).toHaveLength(2);

    const form = screen.getByRole('form', { name: 'Screening questions' });
    await userEvent.click(within(form).getByLabelText('Yes'));
    await userEvent.click(within(form).getByLabelText(/I worked for an operator/));
    await userEvent.type(
      within(form).getByLabelText(/what will you be able to tell the client/),
      'I sourced green coffee from three Saudi importers for 60 stores.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByRole('heading', { name: 'You’re in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start interview' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/expert\/interviews\/int_/),
    );
  });

  it('says why a conflicted call isn’t a fit', async () => {
    renderWithProviders(<CallDetail callId="call_gulf_brands_menu" />, { persona: 'sara' });
    const form = await screen.findByRole('form', { name: 'Screening questions' });
    await userEvent.click(within(form).getByLabelText(/I advised companies/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(
      await screen.findByRole('heading', { name: 'This call isn’t a fit this time' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/listed as a conflict of interest/)).toBeInTheDocument();
  });

  it('shows a not-found state for a closed call', async () => {
    renderWithProviders(<CallDetail callId="call_gone" />, { persona: 'sara' });
    expect(
      await screen.findByRole('heading', { name: 'We couldn’t find that call' }),
    ).toBeInTheDocument();
  });

  it('shows the first-use empty state when there are no calls', async () => {
    setControls({ emptyData: true });
    mockLocation.pathname = '/expert/calls';
    renderWithProviders(<CallsBrowser />, { persona: 'sara' });
    expect(
      await screen.findByRole('heading', { name: 'No interview requests right now' }),
    ).toBeInTheDocument();
  });
});
