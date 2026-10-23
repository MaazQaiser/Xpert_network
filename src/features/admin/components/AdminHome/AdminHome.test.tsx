import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';

describe('AdminHome (F11, screen 01)', () => {
  it('greets the PM, shows the summary and the AI tip', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(
      await screen.findByRole('heading', { name: /Hey Palto Kersion, good/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', {
        name: 'Experts pending review: 4. Ask the assistant which experts need review',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start with PRJ-1042' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/brief',
    );
    await expectNoAxeViolations(container);
  });

  it('answers a suggested question with the experts to review', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Which experts need my review?' }),
    );
    expect(await screen.findByText(/4 expert answers are waiting/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review answers' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1040',
    );
  });

  it('new projects card: pick an email, get its brief on a canvas, open the project file', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('link', { name: /New projects today: 3/ }));
    expect(await screen.findByText(/3 new projects came in today/)).toBeInTheDocument();
    const emails = screen.getByRole('list', { name: 'Emails' });
    expect(within(emails).getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(
      within(emails).getByRole('button', { name: /Show the brief: Omar Siddiqui/ }),
    );
    const canvas = await screen.findByRole('article', { name: /UK MRO carve-out/ });
    expect(within(canvas).getByText(/EASA Part 145 and UK CAA approvals/)).toBeInTheDocument();
    expect(within(canvas).getByRole('link', { name: 'Open project file' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1043/brief',
    );

    // Edit the brief in place; it saves to the project file.
    await userEvent.click(within(canvas).getByRole('button', { name: 'Edit' }));
    const brief = within(canvas).getByLabelText('Brief');
    await userEvent.clear(brief);
    await userEvent.type(
      brief,
      'Northgate needs 4–5 calls on Part 145 readiness after a carve-out.',
    );
    await userEvent.click(within(canvas).getByRole('button', { name: 'Save' }));
    expect(
      await within(canvas).findByText(/Northgate needs 4–5 calls on Part 145 readiness/),
    ).toBeInTheDocument();
    expect(db.get().adminProjects['PRJ-1043']?.brief).toMatch(/^Northgate needs 4–5 calls/);
  });

  it('emails card: the top 3 emails, then a summary with next steps', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('link', { name: /Emails received today/ }));
    const emails = await screen.findByRole('list', { name: 'Emails' });
    expect(within(emails).getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(within(emails).getAllByRole('button', { name: /Summarise it/ })[0]!);
    expect(await screen.findByRole('article', { name: /Summary of/ })).toBeInTheDocument();
    expect(
      screen.getAllByRole('list', { name: 'Suggested next steps' }).at(-1),
    ).toBeInTheDocument();
  });

  it('the mascot thinks while loading, rests, then reacts to an answer', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    const mascot = () => container.querySelector('[data-mood]');
    expect(mascot()).toHaveAttribute('data-mood', 'thinking');
    await screen.findByRole('link', {
      name: 'Experts pending review: 4. Ask the assistant which experts need review',
    });
    expect(mascot()).toHaveAttribute('data-mood', 'idle');
    await userEvent.click(screen.getByRole('button', { name: 'Which experts need my review?' }));
    expect(await screen.findByText(/4 expert answers are waiting/)).toBeInTheDocument();
    expect(mascot()).toHaveAttribute('data-mood', 'happy');
  });

  it('shows an error with retry when the summary fails', async () => {
    setControls({ apiError: true });
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(await screen.findByText('Today’s summary didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
