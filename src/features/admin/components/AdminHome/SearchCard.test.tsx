import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChatBlock } from '@/features/admin';
import { expectNoAxeViolations } from '@/test/axe';
import { CAFE_SEARCH, scriptSearch, server } from '@/test/mockBackend';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';
import { SearchCard } from './SearchCard';

type Confirm = Extract<ChatBlock, { kind: 'searchConfirm' }>;

/** Crestline wants 6 people: 3 thru-hikers and 3 trail runners. */
const CRESTLINE: Confirm = {
  kind: 'searchConfirm',
  briefId: 'brief_trail',
  company: 'Crestline Insights',
  target: 6,
  groups: [
    { name: 'Hiker', quota: 3 },
    { name: 'Runner', quota: 3 },
  ],
  columns: [
    { id: 'col_1', label: 'In the US', group: null },
    { id: 'col_2', label: '2+ overnight hikes', group: 'Hiker' },
    { id: 'col_3', label: '6+ trail runs', group: 'Runner' },
  ],
  exaBudget: 2,
  fullenrichCreditCap: 50,
  ready: true,
  blocker: null,
  preparedAt: '2026-11-16T09:00:00+00:00',
};

function renderCard(block: Confirm = CRESTLINE) {
  const onOpenResults = vi.fn();
  renderWithProviders(<SearchCard block={block} onOpenResults={onOpenResults} />, {
    persona: 'ops',
  });
  return { onOpenResults };
}

/** Records what the page POSTs. */
function recordPosts() {
  const posts: { url: string; body: unknown }[] = [];
  server.events.on('request:start', async ({ request }) => {
    if (request.method !== 'POST') return;
    const text = await request.clone().text();
    posts.push({ url: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
  });
  return posts;
}

describe('a people search in the chat', () => {
  it('confirms_then_starts_and_follows_progress_to_the_end', async () => {
    const posts = recordPosts();
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    const field = await screen.findByRole('textbox', { name: 'Ask Scio' });
    await userEvent.type(field, 'Find people for the Meridian Capital brief{Enter}');

    const card = await screen.findByRole('region', { name: 'People search: Meridian Capital' });
    expect(await within(card).findByText('Find 2 people for Meridian Capital')).toBeInTheDocument();
    expect(within(card).getByText('Procurement leader')).toBeInTheDocument();
    expect(
      within(card).getByText('Web budget $2.00 · Profile search up to 50 credits'),
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(posts.some((p) => p.url === '/api/searches')).toBe(true));
    expect(posts.find((p) => p.url === '/api/searches')?.body).toMatchObject({
      briefId: 'brief_gcc_cafe',
      conversationId: expect.any(String),
    });

    expect(await within(card).findByText(/Searching for 2 people · 1 found/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Stop' })).toBeInTheDocument();

    expect(await within(card).findByText('Found 2 of 2')).toBeInTheDocument();
    expect(
      within(card).getByText('Web $1.30 · Profile search 12.5 credits (≈ $0.60) · total ≈ $1.90'),
    ).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Stop' })).toBeNull();
    expect(card.textContent).not.toMatch(/FullEnrich|Exa\b|GetSales/);
    server.events.removeAllListeners();
  });

  it('shows the confirmation grouped, then the live progress with group counts', async () => {
    scriptSearch({
      ...CAFE_SEARCH,
      base: {
        ...CAFE_SEARCH.base,
        target: 6,
        groups: CRESTLINE.groups,
        progress: {
          matches: 0,
          byGroup: [
            { name: 'Hiker', found: 0, quota: 3 },
            { name: 'Runner', found: 0, quota: 3 },
          ],
          done: false,
        },
      },
      steps: [
        {
          type: 'progress',
          progress: {
            matches: 3,
            byGroup: [
              { name: 'Hiker', found: 2, quota: 3 },
              { name: 'Runner', found: 1, quota: 3 },
            ],
            done: false,
            analysed: 41,
          },
          cost: {
            exaDollars: 0.8,
            fullenrichCredits: 4,
            fullenrichDollars: null,
            totalDollars: 0.8,
          },
          status: 'running',
          note: null,
        },
      ],
      waitForStopBefore: 1,
    });
    const { onOpenResults } = renderCard();
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    expect(
      await within(card).findByText('Find 6 people for Crestline Insights'),
    ).toBeInTheDocument();
    const hikers = within(card).getByRole('list', { name: 'Hiker (3 needed)' });
    expect(within(hikers).getByText('2+ overnight hikes')).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Every match needs' })).toBeInTheDocument();
    await expectNoAxeViolations(card);

    await userEvent.click(within(card).getByRole('button', { name: 'Start' }));
    expect(
      await within(card).findByText('Searching for 6 people · 3 found · 41 checked · $0.80 so far'),
    ).toBeInTheDocument();
    expect(within(card).getByText('Hiker 2/3 · Runner 1/3')).toBeInTheDocument();
    await expectNoAxeViolations(card);
    await userEvent.click(within(card).getByRole('button', { name: 'View results' }));
    expect(onOpenResults).toHaveBeenCalledWith('search_1');
  });

  it('stop_asks_the_search_to_stop', async () => {
    scriptSearch({ ...CAFE_SEARCH, waitForStopBefore: 2 });
    const posts = recordPosts();
    renderCard();
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Start' }));
    await within(card).findByText(/1 found/);

    await userEvent.click(within(card).getByRole('button', { name: 'Stop' }));
    await waitFor(() =>
      expect(posts.some((p) => p.url === '/api/searches/search_1/stop')).toBe(true),
    );
    expect(await within(card).findByText('Stopped')).toBeInTheDocument();
    expect(within(card).getByText('1 of 2 found · 20 checked')).toBeInTheDocument();
    server.events.removeAllListeners();
  });

  it('a_blocked_card_says_why_and_has_no_start', async () => {
    renderCard({
      ...CRESTLINE,
      target: null,
      ready: false,
      blocker: 'Add the number of people needed',
    });
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    expect(await within(card).findByText('Find people for Crestline Insights')).toBeInTheDocument();
    expect(within(card).getByText('Add the number of people needed')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Start' })).toBeNull();
    await expectNoAxeViolations(card);
  });

  it('budget_reached_is_shown', async () => {
    scriptSearch({
      ...CAFE_SEARCH,
      end: { status: 'budget_reached', note: 'Exa budget reached ($2.00)' },
    });
    renderCard();
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Start' }));
    expect(await within(card).findByText('Web search budget reached ($2.00)')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/Exa\b/);
    await expectNoAxeViolations(card);
  });

  it('says why a search couldn’t find more, or failed', async () => {
    scriptSearch({
      ...CAFE_SEARCH,
      steps: [],
      end: { status: 'exhausted', note: 'No more café chains to look in' },
    });
    renderCard();
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Start' }));
    expect(
      await within(card).findByText('Couldn’t find more: No more café chains to look in'),
    ).toBeInTheDocument();
  });

  it('cancel leaves nothing started', async () => {
    const posts = recordPosts();
    renderCard();
    const card = await screen.findByRole('region', { name: 'People search: Crestline Insights' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Cancel' }));
    expect(within(card).getByText('Cancelled. Nothing was searched.')).toBeInTheDocument();
    expect(posts).toEqual([]);
    server.events.removeAllListeners();
  });
});
