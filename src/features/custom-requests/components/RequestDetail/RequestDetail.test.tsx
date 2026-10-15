import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, scenarios } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { RequestsList } from '../RequestsList/RequestsList';
import { RequestDetail } from './RequestDetail';

const ID = 'req_qahwa_pipeline';

describe('RequestDetail (F4)', () => {
  it('accepts a quote and holds the credits', async () => {
    const { container } = renderWithProviders(<RequestDetail requestId={ID} />, {
      persona: 'ayesha',
    });
    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
    expect(screen.getByText('How credits work')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const quote = screen.getByRole('region', { name: 'Your quote' });
    await userEvent.click(
      await within(quote).findByRole('button', { name: 'Accept and hold 180 credits' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Accept this quote?' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Accept and hold 180 credits' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Research in progress' }),
    ).toBeInTheDocument();
    expect(db.get().wallets.usr_ayesha).toMatchObject({ balance: 210, held: 180 });
  });

  it('declines with a reason, then can ask for a new quote', async () => {
    renderWithProviders(<RequestDetail requestId={ID} />, { persona: 'ayesha' });
    await userEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    const dialog = await screen.findByRole('dialog', { name: 'Decline this quote?' });
    await userEvent.click(within(dialog).getByText('Takes too long'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Decline quote' }));

    expect(await screen.findByText(/Reason: Takes too long/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ask for a new quote' }));
    expect(await screen.findByText('We’re preparing your quote')).toBeInTheDocument();
  });

  it('sends a question and shows the team’s reply', async () => {
    renderWithProviders(<RequestDetail requestId={ID} />, { persona: 'ayesha' });
    await userEvent.type(await screen.findByLabelText('Your question'), 'How long will it take?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(within(messages).getByText(/fastest we can do is 7 working days/)).toBeInTheDocument();
  });

  it('shows a partial delivery with its refund, and saves a rating', async () => {
    db.update((draft) => {
      draft.sessionUserId = 'usr_ayesha';
    });
    await fetch(`/api/requests/${ID}/accept`, { method: 'POST' });
    scenarios.advanceRequest();
    scenarios.advanceRequest();
    scenarios.deliverPartially();
    renderWithProviders(<RequestDetail requestId={ID} />, { persona: 'ayesha' });

    expect(await screen.findByText(/Delivered with 2 of 4 interviews/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open report' })).toHaveAttribute(
      'href',
      `/library/cus_${ID}/read`,
    );
    await userEvent.click(screen.getByText('4'));
    await waitFor(() => expect(db.get().requests[ID]!.delivery!.rating).toBe(4));
  });
});

describe('RequestsList (F4)', () => {
  it('groups requests and summarises what’s next', async () => {
    const { container } = renderWithProviders(<RequestsList />, { persona: 'ayesha' });
    expect(await screen.findByRole('heading', { name: /In progress/ })).toBeInTheDocument();
    expect(screen.getByText(/180 credits · 4 experts · valid until/)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('invites a first request when there are none', async () => {
    renderWithProviders(<RequestsList />, { persona: 'bilal' });
    expect(await screen.findByText('No custom research yet')).toBeInTheDocument();
  });
});
