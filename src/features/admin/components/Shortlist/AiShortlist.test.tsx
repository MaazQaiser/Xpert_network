import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import type { ShortlistedExpert } from '../../model/match.schema';
import { AiShortlist } from './AiShortlist';

async function seedShortlist() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
  await fetch('/api/admin/projects/PRJ-1042/approve', { method: 'POST' });
  await fetch('/api/admin/projects/PRJ-1042/shortlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size: 10 }),
  });
}

describe('AiShortlist (F13, screen 05)', () => {
  it('shows ranked experts, coverage and selection count', async () => {
    await seedShortlist();
    const { container } = renderWithProviders(<AiShortlist projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(await screen.findByText(/#1 Expert #4821/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client question coverage' })).toBeInTheDocument();
    expect(screen.getByText(/8 of 10 selected/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pitch 8 experts' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('can deselect an expert for pitching', async () => {
    await seedShortlist();
    renderWithProviders(<AiShortlist projectId="PRJ-1042" />, { persona: 'ops' });
    const heading = await screen.findByRole('heading', { name: /#1 Expert #4821/ });
    const card = heading.closest('article');
    expect(card).toBeInstanceOf(HTMLElement);
    await userEvent.click(
      within(card as HTMLElement).getByRole('checkbox', { name: 'Select Expert #4821' }),
    );
    await waitFor(() => {
      expect(screen.getByText(/7 of 10 selected/)).toBeInTheDocument();
      const first = db
        .get()
        .adminShortlists['PRJ-1042']?.experts.find((e: ShortlistedExpert) => e.id === 'exp_4821');
      expect(first?.selected).toBe(false);
    });
  });
});
