import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchPerson } from '@/features/admin';
import { expectNoAxeViolations } from '@/test/axe';
import { seedSearch, type SearchScript } from '@/test/mockBackend';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';
import { SearchResultsPanel } from './SearchResultsPanel';

const unclear = (reason = 'Not checked on the web yet') => ({
  verdict: 'unclear' as const,
  reason,
  references: [],
});
const match = (reason: string, references: string[] = []) => ({
  verdict: 'match' as const,
  reason,
  references,
});
const miss = (reason: string) => ({ verdict: 'miss' as const, reason, references: [] });

const person = (fields: Partial<SearchPerson> & Pick<SearchPerson, 'id' | 'name'>) => ({
  linkedinUrl: null,
  email: null,
  phone: null,
  title: null,
  company: null,
  location: null,
  source: 'exa' as const,
  sourceUrl: null,
  verdicts: {},
  isMatch: false,
  profileGroup: null,
  hasContact: true,
  addedAt: '2026-11-16T10:00:00+00:00',
  ...fields,
});

const MAYA = person({
  id: 'p_maya',
  name: 'Maya Torres',
  title: 'Footwear Buyer',
  company: 'Summit Outfitters',
  location: 'Denver, Colorado, United States',
  source: 'fullenrich',
  linkedinUrl: 'https://www.linkedin.com/in/maya-torres',
  verdicts: {
    col_us: match('Based in Denver.'),
    col_hikes: unclear(),
    col_runs: unclear(),
  },
});

const progress = (hikers: number, runners: number, analysed: number) => ({
  type: 'progress' as const,
  progress: {
    matches: hikers + runners,
    byGroup: [
      { name: 'Hiker', found: hikers, quota: 2 },
      { name: 'Runner', found: runners, quota: 2 },
    ],
    done: false,
    analysed,
  },
  cost: { exaDollars: 0.4, fullenrichCredits: 2.5, fullenrichDollars: null, totalDollars: 0.4 },
  status: 'running' as const,
  note: null,
});

/** Crestline's search: 2 hikers and 2 runners, found from both sources. It runs until Stop. */
const TRAIL_SEARCH: SearchScript = {
  base: {
    target: 4,
    columns: [
      {
        id: 'col_us',
        requirementId: 'r_us',
        label: 'In the US',
        route: 'filter',
        // The backend sends "" for a shared column.
        group: '',
        counts: true,
      },
      {
        id: 'col_hikes',
        requirementId: 'r_hikes',
        label: '2+ overnight hikes',
        route: 'exa',
        group: 'Hiker',
        counts: true,
      },
      {
        id: 'col_runs',
        requirementId: 'r_runs',
        label: '6+ trail runs',
        route: 'exa',
        group: 'Runner',
        counts: true,
      },
    ],
    groups: [
      { name: 'Hiker', quota: 2 },
      { name: 'Runner', quota: 2 },
    ],
    progress: progress(0, 0, 0).progress,
    cost: { exaDollars: 0, fullenrichCredits: 0, fullenrichDollars: null, totalDollars: 0 },
  },
  stepMs: 60,
  steps: [
    { type: 'person', person: MAYA },
    progress(0, 0, 10),
    {
      type: 'person',
      person: {
        ...MAYA,
        verdicts: {
          col_us: match('Based in Denver.'),
          // A blank and a repeat, as a web search can return them.
          col_hikes: match('Wrote about a 5-day Colorado Trail section hike.', [
            'https://trailjournals.example/maya-colorado-trail',
            '',
            'https://trailjournals.example/maya-colorado-trail',
          ]),
          col_runs: miss('No trail runs found.'),
        },
        isMatch: true,
        profileGroup: 'Hiker',
      },
    },
    progress(1, 0, 12),
    {
      type: 'person',
      person: person({
        id: 'p_jonas',
        name: 'Jonas Berg',
        company: 'Ridgeline Running Co.',
        sourceUrl: 'https://ridgeline.example/team',
        email: 'jonas@ridgeline.example',
        verdicts: { col_us: match('Store in Portland, Oregon.'), col_runs: unclear() },
      }),
    },
    {
      type: 'person',
      person: person({
        id: 'p_lee',
        name: 'Lee Park',
        phone: '+1 503 555 0142',
        verdicts: { col_us: match('Lives in Bend, Oregon.'), col_hikes: miss('No hikes found.') },
      }),
    },
    {
      type: 'person',
      person: person({
        id: 'p_sam',
        name: 'Sam Ortiz',
        // Matches on paper, but with no way to reach them it isn't a match.
        hasContact: false,
        isMatch: false,
        verdicts: {
          col_us: match('Lives in Flagstaff, Arizona.'),
          col_hikes: match('Thru-hiked the Arizona Trail in 2025.'),
        },
      }),
    },
  ],
  end: { status: 'found', note: null },
  waitForStopBefore: 7,
};

const rowOf = (panel: HTMLElement, name: string) => {
  const row = within(panel).getByText(name).closest('tr');
  if (!row) throw new Error(`No row for ${name}`);
  return row;
};

async function openPanel() {
  const id = seedSearch(TRAIL_SEARCH, 'brief_trail');
  renderWithProviders(<SearchResultsPanel searchId={id} onClose={() => undefined} />, {
    persona: 'ops',
  });
  const panel = await screen.findByRole('complementary', { name: 'Search results' });
  // Everyone in.
  await within(panel).findByText('Sam Ortiz');
  return panel;
}

describe('the live results table', () => {
  it('rows_and_cells_fill_in_as_the_stream_arrives', async () => {
    seedSearch(TRAIL_SEARCH, 'brief_trail');
    renderWithProviders(<SearchResultsPanel searchId="search_1" onClose={() => undefined} />, {
      persona: 'ops',
    });
    const panel = await screen.findByRole('complementary', { name: 'Search results' });

    await within(panel).findByText('Maya Torres');
    const maya = () => rowOf(panel, 'Maya Torres');
    expect(within(maya()).getAllByRole('button', { name: /^Unclear:/ })).toHaveLength(2);
    expect(
      await within(maya()).findByRole('button', { name: 'Match: 2+ overnight hikes' }),
    ).toBeInTheDocument();
    expect(within(maya()).getByRole('button', { name: 'Miss: 6+ trail runs' })).toBeInTheDocument();

    for (const group of ['Shared', 'Hiker', 'Runner']) {
      expect(within(panel).getByRole('columnheader', { name: group })).toBeInTheDocument();
    }
    expect(await within(panel).findByText('Hiker 1/2 · Runner 0/2')).toBeInTheDocument();
    await within(panel).findByText('Sam Ortiz');
    // Arrival order.
    const names = within(panel)
      .getAllByRole('row')
      .map((row) => row.querySelector('[data-name]')?.textContent)
      .filter(Boolean);
    expect(names).toEqual(['Maya Torres', 'Jonas Berg', 'Lee Park', 'Sam Ortiz']);
  });

  it('each_cell_explains_its_verdict', async () => {
    const panel = await openPanel();
    const cell = within(rowOf(panel, 'Maya Torres')).getByRole('button', {
      name: 'Match: 2+ overnight hikes',
    });
    await userEvent.click(cell);
    expect(cell).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(panel).getByText('Wrote about a 5-day Colorado Trail section hike.'),
    ).toBeInTheDocument();
    // The open toggletip auto-aligns, which jsdom can't lay out, so it stays visibility: hidden
    // and out of the accessibility tree here; the link itself is checked by its text. A blank
    // reference and a repeat give one link.
    const references = panel.querySelector<HTMLElement>('ul[aria-label="References"]');
    if (!references) throw new Error('No references');
    expect(references.querySelectorAll('a')).toHaveLength(1);
    expect(within(references).getByText('trailjournals.example').closest('a')).toHaveAttribute(
      'href',
      'https://trailjournals.example/maya-colorado-trail',
    );
  });

  it('contact_column_shows_linkedin_else_email_else_phone_else_no_contact', async () => {
    const panel = await openPanel();
    expect(
      within(rowOf(panel, 'Maya Torres')).getByRole('link', { name: /LinkedIn/ }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/maya-torres');
    expect(
      within(rowOf(panel, 'Jonas Berg')).getByRole('link', { name: 'jonas@ridgeline.example' }),
    ).toHaveAttribute('href', 'mailto:jonas@ridgeline.example');
    expect(
      within(rowOf(panel, 'Lee Park')).getByRole('link', { name: '+1 503 555 0142' }),
    ).toHaveAttribute('href', 'tel:+15035550142');
    expect(within(rowOf(panel, 'Sam Ortiz')).getByText('No contact found')).toBeInTheDocument();
  });

  it('source_column_says_profile_search_or_web', async () => {
    const panel = await openPanel();
    expect(within(rowOf(panel, 'Maya Torres')).getByText('Profile search')).toBeInTheDocument();
    expect(within(rowOf(panel, 'Jonas Berg')).getByText('Web')).toBeInTheDocument();
    expect(panel.textContent).not.toMatch(/FullEnrich|Exa\b|GetSales/);
  });

  it('matches_only_toggle_filters_rows', async () => {
    const panel = await openPanel();
    const maya = rowOf(panel, 'Maya Torres');
    const name = maya.querySelector('[data-name]')?.closest('td');
    if (!name) throw new Error('No name cell');
    expect(within(name).getByText('Match')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('switch', { name: 'Matches only' }));
    await waitFor(() => expect(within(panel).queryByText('Jonas Berg')).toBeNull());
    expect(within(panel).queryByText('Lee Park')).toBeNull();
    expect(within(panel).queryByText('Sam Ortiz')).toBeNull();
    expect(within(panel).getByText('Maya Torres')).toBeInTheDocument();
  });

  it('passes axe, with the footer and Stop while it runs', async () => {
    const panel = await openPanel();
    expect(within(panel).getByText('1 match · 12 checked')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    await expectNoAxeViolations(panel);
  });

  it('opens from the chat card beside the chat', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    const field = await screen.findByRole('textbox', { name: 'Ask Scio' });
    await userEvent.type(field, 'Find people for the Meridian Capital brief{Enter}');
    const card = await screen.findByRole('region', { name: 'People search: Meridian Capital' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Start' }));
    await userEvent.click(await within(card).findByRole('button', { name: 'View results' }));
    const panel = await screen.findByRole('complementary', { name: 'Search results' });
    expect(await within(panel).findByText('Omar Khalid')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('complementary', { name: 'Search results' })).toBeNull();
  });
});
