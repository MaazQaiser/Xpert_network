import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';

describe('AdminHome (F11, screen 01)', () => {
  it('greets the PM, shows the summary and the AI tip', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(
      await screen.findByRole('heading', { name: /Hey Paltu Kerison, good/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Experts pending review: 4. Review experts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start with PRJ-1042' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/brief',
    );
    await expectNoAxeViolations(container);
  });

  it('answers a suggested question with links', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Which experts need my review?' }),
    );
    expect(await screen.findByText(/4 expert answers are waiting/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open PRJ-1040' })).toBeInTheDocument();
  });

  it('the mascot thinks while loading, rests, then reacts to an answer', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    const mascot = () => container.querySelector('[data-mood]');
    expect(mascot()).toHaveAttribute('data-mood', 'thinking');
    await screen.findByRole('link', { name: 'Experts pending review: 4. Review experts' });
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
