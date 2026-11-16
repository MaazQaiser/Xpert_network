import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoAxeViolations } from '@/test/axe';
import type { BriefRequirements } from '@/features/admin';
import { seedRequirements, server } from '@/test/mockBackend';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';
import { RequirementsPanel } from './RequirementsPanel';

const PANEL = /Meridian Capital: Experts needed/;

/** Asks Scio to extract the café brief's requirements; they open beside the chat. */
async function extract() {
  renderWithProviders(<AdminHome />, { persona: 'ops' });
  const field = await screen.findByRole('textbox', { name: 'Ask Scio' });
  await userEvent.type(field, 'Extract the requirements from the Meridian Capital brief{Enter}');
  return screen.findByRole('complementary', { name: PANEL });
}

const bullet = (panel: HTMLElement, text: string) => {
  const item = within(panel)
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(text));
  if (!item) throw new Error(`No bullet "${text}"`);
  return item;
};

describe('reviewing a brief’s requirements', () => {
  it('opens them beside the chat, grouped, with a card in the chat to reopen them', async () => {
    const panel = await extract();
    expect(within(panel).getByText('Draft')).toBeInTheDocument();
    expect(within(panel).getByText(/3-5 GCC café procurement leaders/)).toBeInTheDocument();
    const headings = within(panel)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      'Who we need1',
      'Must have2',
      'Nice to have0',
      'Exclude1',
      'Quotas0',
      'Logistics0',
      'To confirm1',
      'Screening questions2Suggested by AI',
      'Search plan',
    ]);
    expect(within(panel).getAllByText('None in the email.')).toHaveLength(3);
    await expectNoAxeViolations(panel);

    // The card in the chat says where they stand and opens them again after closing.
    expect(screen.getByText('Requirements: Meridian Capital')).toBeInTheDocument();
    expect(screen.getByText('4 requirements · 1 to confirm with the client')).toBeInTheDocument();
    expect(screen.getByText('2 screening questions, suggested')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('complementary', { name: PANEL })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Review requirements' }));
    expect(await screen.findByRole('complementary', { name: PANEL })).toBeInTheDocument();
  });

  it('shows where each bullet came from, and flags words that aren’t in the email', async () => {
    const panel = await extract();
    const gcc = bullet(panel, 'Based in the GCC');
    await userEvent.click(within(gcc).getByRole('button', { name: 'Show where this came from' }));
    expect(within(gcc).getByText('From the email')).toBeInTheDocument();
    expect(within(gcc).getByText(/Based in the UAE, Saudi Arabia/)).toBeInTheDocument();

    const years = bullet(panel, 'At least 7 years in procurement');
    expect(within(years).getByText('Check source')).toBeInTheDocument();
    await userEvent.click(within(years).getByRole('button', { name: 'Show where this came from' }));
    expect(within(years).getByText(/These words aren’t in the email/)).toBeInTheDocument();

    const dates = bullet(panel, 'Which dates next week?');
    await userEvent.click(within(dates).getByRole('button', { name: 'Show where this came from' }));
    expect(within(dates).getByText('Not in the email.')).toBeInTheDocument();
  });

  it('edits, deletes and adds bullets, then accepts them', async () => {
    const sent: unknown[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT') sent.push(await request.clone().json());
    });
    const panel = await extract();

    // Edit.
    await userEvent.click(
      within(panel).getByRole('button', { name: 'Edit: At least 7 years in procurement' }),
    );
    const field = within(panel).getByLabelText('Edit requirement');
    await userEvent.clear(field);
    await userEvent.type(field, 'At least 5 years in procurement or supply chain');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    expect(
      await within(panel).findByText('At least 5 years in procurement or supply chain'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Edited')).toBeInTheDocument();

    // Delete.
    await userEvent.click(
      within(panel).getByRole('button', { name: 'Delete: Current Brand X employees' }),
    );
    await waitFor(() => expect(within(panel).queryByText('Current Brand X employees')).toBeNull());

    // Add.
    await userEvent.click(within(panel).getByRole('button', { name: 'Add to nice to have' }));
    await userEvent.type(within(panel).getByLabelText('New requirement'), 'Speaks Arabic');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    expect(await within(panel).findByText('Speaks Arabic')).toBeInTheDocument();
    expect(sent).toHaveLength(3);

    // Accept: the panel and the card in the chat both say so.
    await userEvent.click(within(panel).getByRole('button', { name: 'Accept requirements' }));
    expect(await within(panel).findByRole('button', { name: 'Accepted' })).toBeDisabled();
    expect(within(panel).getByText(/^Accepted .+\.$/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'View requirements' })).toBeInTheDocument();
    server.events.removeAllListeners();
  });

  it('shows the screening questions with their answers, and edits, adds and deletes them', async () => {
    const sent: { questions?: unknown[] }[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT') sent.push(await request.clone().json());
    });
    const panel = await extract();
    const q2 = within(panel).getByRole('list', { name: 'Answers to Q2' });
    expect(
      within(q2)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Green coffee', 'Dairy', 'None of theseDQ']);
    expect(within(panel).getByText('Select all that apply')).toBeInTheDocument();

    // Where a question came from: the requirement it checks.
    const first = bullet(panel, 'Q1');
    await userEvent.click(within(first).getByRole('button', { name: 'Show where this came from' }));
    expect(within(first).getByText('Checks this from the email')).toBeInTheDocument();

    // Edit: a disqualifying answer is marked with (DQ) at the end of its line.
    await userEvent.click(within(panel).getByRole('button', { name: 'Edit Q1' }));
    const answers = within(panel).getByLabelText('Answers, one per line');
    await userEvent.clear(answers);
    await userEvent.type(answers, 'Yes{Enter}No (DQ)');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    const q1 = await within(panel).findByRole('list', { name: 'Answers to Q1' });
    expect(
      within(q1)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Yes', 'NoDQ']);
    expect(sent.at(-1)?.questions?.[0]).toMatchObject({
      id: 'q_openings',
      options: [
        { text: 'Yes', disqualifies: false },
        { text: 'No', disqualifies: true },
      ],
    });

    // Add an open question of their own.
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a question' }));
    await userEvent.type(
      within(panel).getByLabelText('New question'),
      'Which brands have you worked for?',
    );
    await userEvent.selectOptions(within(panel).getByLabelText('Answer'), 'open');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    const mine = bullet(panel, 'Q3');
    expect(await within(mine).findByText('Yours')).toBeInTheDocument();
    expect(within(mine).getByText('Open response')).toBeInTheDocument();

    // Delete.
    await userEvent.click(within(panel).getByRole('button', { name: 'Delete Q2' }));
    await waitFor(() => expect(within(panel).queryByText('Dairy')).toBeNull());
    expect(sent.at(-1)?.questions).toHaveLength(2);
    server.events.removeAllListeners();
  });

  it('goes back to the AI’s draft, dropping edits', async () => {
    const panel = await extract();
    await userEvent.click(within(panel).getByRole('button', { name: 'Delete: Based in the GCC' }));
    await within(panel).findByText('Edited');
    await userEvent.click(within(panel).getByRole('button', { name: 'Revert to AI draft' }));
    expect(await within(panel).findByText('Based in the GCC')).toBeInTheDocument();
    expect(within(panel).queryByText('Edited')).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Revert to AI draft' })).toBeNull();
  });

  it('offers extraction on each brief card', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    const field = await screen.findByRole('textbox', { name: 'Ask Scio' });
    await userEvent.type(field, 'What new briefs do we have?{Enter}');
    await userEvent.click(
      await screen.findByRole('button', { name: /^Extract requirements: Layla Haddad/ }),
    );
    expect(
      await screen.findByText('Extract the requirements from the Meridian Capital brief'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('complementary', { name: PANEL })).toBeInTheDocument();
  });
});

/** A brief that wants two kinds of people, with a plan that routes each requirement. */
const TRAIL: BriefRequirements = {
  briefId: 'brief_trail',
  company: 'Crestline Insights',
  subject: 'Outdoor footwear buyers who hike or run',
  attachment: null,
  status: 'accepted',
  summary: '4 outdoor retail buyers: 2 thru-hikers and 2 trail runners',
  edited: false,
  sections: [
    {
      key: 'who',
      title: 'Who we need',
      items: [
        {
          id: 'r_buyer',
          text: 'Footwear buyers at outdoor retailers, manager level or above',
          source: null,
          sourceFound: false,
        },
      ],
    },
    {
      key: 'must_have',
      title: 'Must have',
      items: [
        {
          id: 'r_hikes',
          text: '2+ overnight hikes in the last year',
          source: null,
          sourceFound: false,
        },
        { id: 'r_runs', text: '6+ trail runs in the last year', source: null, sourceFound: false },
        {
          id: 'r_bought',
          text: 'Bought footwear for a store in the last 2 years',
          source: null,
          sourceFound: false,
        },
      ],
    },
    {
      key: 'exclude',
      title: 'Exclude',
      items: [{ id: 'r_rei', text: 'Current REI employees', source: null, sourceFound: false }],
    },
    {
      key: 'quotas',
      title: 'Quotas',
      items: [{ id: 'r_split', text: '2 hikers and 2 runners', source: null, sourceFound: false }],
    },
  ],
  questions: [],
  updatedAt: '2026-11-16T09:00:00+00:00',
  acceptedAt: '2026-11-16T09:00:00+00:00',
  icpCount: 4,
  planStatus: 'ready',
  planCurrent: true,
  plan: {
    routes: [
      { requirementId: 'r_buyer', route: 'filter', questions: [] },
      { requirementId: 'r_hikes', route: 'exa', questions: [] },
      { requirementId: 'r_runs', route: 'exa', questions: [] },
      { requirementId: 'r_bought', route: 'screening', questions: [8] },
      { requirementId: 'r_rei', route: 'filter', questions: [] },
      { requirementId: 'r_split', route: 'none', questions: [] },
    ],
    columns: [
      {
        id: 'col_1',
        requirementId: 'r_buyer',
        label: 'Footwear buyer',
        route: 'filter',
        group: null,
        counts: true,
      },
      {
        id: 'col_2',
        requirementId: 'r_hikes',
        label: '2+ overnight hikes',
        route: 'exa',
        group: 'Hiker',
        counts: true,
      },
      {
        id: 'col_3',
        requirementId: 'r_runs',
        label: '6+ trail runs',
        route: 'exa',
        group: 'Runner',
        counts: true,
      },
      {
        id: 'col_4',
        requirementId: 'r_rei',
        label: 'Not at REI',
        route: 'filter',
        group: null,
        counts: true,
      },
    ],
    groups: [
      { name: 'Hiker', quota: 2 },
      { name: 'Runner', quota: 2 },
    ],
    filters: [
      {
        field: 'current_position_seniority_level',
        values: ['Director', 'Manager'],
        exclude: false,
        min: null,
        max: null,
        covers: ['r_buyer'],
      },
      {
        field: 'current_company_names',
        values: ['REI'],
        exclude: true,
        min: null,
        max: null,
        covers: ['r_rei'],
      },
    ],
    queries: [
      {
        query: 'Outdoor retailers in the US with their own footwear buyers',
        purpose: 'companies',
        covers: ['r_buyer'],
      },
      {
        query: 'Retail buyers who write about their thru-hiking trips',
        purpose: 'people',
        covers: ['r_hikes'],
      },
    ],
  },
};

async function openTrail(requirements: BriefRequirements = TRAIL) {
  seedRequirements(requirements);
  renderWithProviders(<RequirementsPanel briefId="brief_trail" onClose={() => undefined} />, {
    persona: 'ops',
  });
  return screen.findByRole('complementary', { name: /Crestline Insights/ });
}

describe('the number needed and the search plan', () => {
  it('shows the number of ICPs needed as a number field', async () => {
    const panel = await openTrail();
    const field = within(panel).getByRole('spinbutton', { name: 'Number of ICPs needed' });
    expect(field).toHaveValue(4);
    expect(field).toHaveAttribute('min', '1');
    expect(field).toHaveAttribute('max', '50');
    expect(within(panel).getByText('Hiker 2 · Runner 2')).toBeInTheDocument();
  });

  it('asks for a number when the email has none', async () => {
    const panel = await openTrail({ ...TRAIL, icpCount: null });
    expect(within(panel).getByText('Not in the email: add a number')).toBeInTheDocument();
    expect(within(panel).getByRole('spinbutton', { name: 'Number of ICPs needed' })).toHaveValue(
      null,
    );
  });

  it('saves a new number', async () => {
    const sent: { icpCount?: number; sections?: unknown[] }[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT') sent.push(await request.clone().json());
    });
    const panel = await extract();
    const field = within(panel).getByRole('spinbutton', { name: 'Number of ICPs needed' });
    expect(field).toHaveValue(5);
    await userEvent.clear(field);
    await userEvent.type(field, '6');
    await userEvent.tab();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ icpCount: 6 });
    expect(sent[0]?.sections).toHaveLength(7);
    await waitFor(() =>
      expect(within(panel).getByRole('spinbutton', { name: 'Number of ICPs needed' })).toHaveValue(
        6,
      ),
    );
    server.events.removeAllListeners();
  });

  it('tags each requirement with how it’s searched', async () => {
    const panel = await openTrail();
    expect(
      within(bullet(panel, 'Footwear buyers')).getByText('Profile search'),
    ).toBeInTheDocument();
    expect(within(bullet(panel, '2+ overnight hikes')).getByText('Web')).toBeInTheDocument();
    expect(within(bullet(panel, 'Bought footwear')).getByText('Screening Q8')).toBeInTheDocument();
    const quota = bullet(panel, '2 hikers and 2 runners');
    expect(within(quota).queryByText(/Profile search|Web|Screening/)).toBeNull();
  });

  it('lists the search plan: filters, exclusions and web searches with their purpose', async () => {
    const panel = await openTrail();
    const plan = within(panel).getByRole('region', { name: 'Search plan' });
    expect(within(plan).getByText('Seniority: Director, Manager')).toBeInTheDocument();
    expect(within(plan).getByText('Current company: not REI')).toBeInTheDocument();
    expect(within(plan).getByText('Finds companies')).toBeInTheDocument();
    expect(
      within(plan).getByText('Outdoor retailers in the US with their own footwear buyers'),
    ).toBeInTheDocument();
    expect(within(plan).getByText('Finds people')).toBeInTheDocument();
    // Read-only: nothing in the plan to edit.
    expect(within(plan).queryByRole('button', { name: /Edit|Delete/ })).toBeNull();
    // Never the providers' names.
    expect(panel.textContent).not.toMatch(/FullEnrich|Exa\b|GetSales/);
    await expectNoAxeViolations(panel);
  });

  it('says while the plan is updating', async () => {
    const panel = await openTrail({ ...TRAIL, planStatus: 'updating' });
    expect(within(panel).getByText('Updating the search plan…')).toBeInTheDocument();
    await expectNoAxeViolations(panel);
  });
});
