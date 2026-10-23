import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { MatchedExperts } from './MatchedExperts';

async function approvePrj1042() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
  await fetch('/api/admin/projects/PRJ-1042/approve', { method: 'POST' });
}

describe('MatchedExperts (F13, screen 04)', () => {
  it('lists the 146 matches and can generate a shortlist', async () => {
    await approvePrj1042();
    const { container } = renderWithProviders(<MatchedExperts projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', { name: /146 experts match this project/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Expert #4821')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Generate Top 10 shortlist' }));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/projects/PRJ-1042/shortlist'),
    );
    expect(db.get().adminShortlists['PRJ-1042']?.experts).toHaveLength(10);
  });

  it('pins a selected expert to the shortlist', async () => {
    await approvePrj1042();
    renderWithProviders(<MatchedExperts projectId="PRJ-1042" />, { persona: 'ops' });
    await screen.findByText('Expert #4821');
    const table = screen.getByRole('table', { name: 'Matched experts' });
    const firstRow = within(table).getAllByRole('row')[1]!;
    await userEvent.click(within(firstRow).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Pin to shortlist' }));
    await waitFor(() => expect(db.get().adminMatches['PRJ-1042']?.experts[0]?.pinned).toBe(true));
  });
});
