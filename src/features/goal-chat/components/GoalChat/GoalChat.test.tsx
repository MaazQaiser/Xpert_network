import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { GoalChat } from './GoalChat';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ask/brf_test',
}));

async function createBrief(): Promise<string> {
  db.update((draft) => {
    draft.sessionUserId = 'usr_bilal';
  });
  const response = await fetch('/api/briefs', { method: 'POST' });
  const brief = (await response.json()) as { id: string };
  return brief.id;
}

describe('GoalChat (F2)', () => {
  it('opens with a streamed greeting and goal chips, then moves to the objective', async () => {
    const briefId = await createBrief();
    const { container } = renderWithProviders(<GoalChat briefId={briefId} />);

    expect(await screen.findByText(/Hi Bilal\. Let’s scope your research/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'New research brief', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Brief steps' })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Expand to a new region' }));
    expect(
      await screen.findByRole('button', { name: /open 3 café franchises in Riyadh/ }),
    ).toBeInTheDocument();
  });

  it('shows a recoverable error when the reply drops mid-stream', async () => {
    const briefId = await createBrief();
    renderWithProviders(<GoalChat briefId={briefId} />);
    await screen.findByText(/Hi Bilal/);

    setControls({ apiError: true });
    await userEvent.click(screen.getByRole('button', { name: 'Invest in a company' }));
    expect(await screen.findByText('Reply interrupted')).toBeInTheDocument();

    setControls({ apiError: false });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.queryByText('Reply interrupted')).not.toBeInTheDocument());
    expect(
      await screen.findByRole('button', { name: /take a stake in Qahwa House/ }),
    ).toBeInTheDocument();
  });
});
