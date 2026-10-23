import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { Responses } from './Responses';

/** Sends the screening questions to the first `count` experts, as the Experts tab does. */
async function sendScreening(count: number) {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
  const search = await fetch('/api/admin/projects/PRJ-1042/expert-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, limit: count }),
  }).then((r) => r.json() as Promise<{ experts: { id: string }[] }>);
  for (const expert of search.experts) {
    await fetch('/api/admin/projects/PRJ-1042/screening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expertId: expert.id }),
    });
  }
}

describe('Responses (F14, screen 08)', () => {
  it('points back to the Experts tab when nothing was sent', async () => {
    renderWithProviders(<Responses projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findByText('No screening questions sent yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the Experts tab' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/brief',
    );
  });

  it('shows who answered, the AI picks and the selected expert’s answers', async () => {
    await sendScreening(6);
    const { container } = renderWithProviders(<Responses projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', { name: '4 of 6 experts answered' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/AI picked/)).toBeInTheDocument();
    // The first answered expert's answers are open; another can be opened from the table.
    expect(screen.getByRole('heading', { name: 'Expert #4821’s answers' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Read Expert #4001’s answers' }));
    expect(screen.getByRole('heading', { name: 'Expert #4001’s answers' })).toBeInTheDocument();
    // Experts who haven't answered can't be moved forward.
    expect(screen.getByRole('checkbox', { name: 'Move Expert #4005 forward' })).toBeDisabled();
    await expectNoAxeViolations(container);
  });

  it('nudges the experts who haven’t finished', async () => {
    await sendScreening(6);
    renderWithProviders(<Responses projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Nudge 2 experts' }));
    expect(await screen.findByText('Reminder sent to 2 experts.')).toBeInTheDocument();
    expect(db.get().adminMail).toHaveLength(2);
  });

  it('confirms availability for the selected experts', async () => {
    await sendScreening(3);
    renderWithProviders(<Responses projectId="PRJ-1042" />, { persona: 'ops' });
    const confirm = await screen.findByRole('button', { name: /Confirm availability for/ });
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/admin/projects/PRJ-1042/availability?experts=exp_4821,exp_4001,exp_4002',
      ),
    );
  });
});
