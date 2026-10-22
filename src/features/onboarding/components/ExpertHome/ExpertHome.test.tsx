import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ExpertHome } from './ExpertHome';

describe('Expert home', () => {
  it('shows interview topics and marks a requested profile match', async () => {
    const { container } = renderWithProviders(<ExpertHome />, { persona: 'sara' });

    expect(await screen.findByRole('heading', { name: 'Welcome, Sara' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Find your next interview' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your expertise' })).not.toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Topics you can interview on' });
    const coffee = within(list).getByRole('link', {
      name: /Specialty coffee supply chains in Saudi Arabia/,
    });
    expect(coffee.parentElement).toHaveTextContent('Matches your profile');

    const requested = within(list).getByRole('link', {
      name: /Franchise fee structures for café brands in the GCC/,
    });
    expect(requested.parentElement).toHaveTextContent('Requested · matches your profile');

    expect(
      screen.getByRole('textbox', { name: 'Describe a topic you can give an interview on' }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('opens the interview that matches what she types', async () => {
    renderWithProviders(<ExpertHome />, { persona: 'sara' });
    await screen.findByRole('list', { name: 'Topics you can interview on' });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Describe a topic you can give an interview on' }),
      'coffee supply in Saudi Arabia',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(mockRouter.push).toHaveBeenCalledWith('/expert/calls/call_ksa_coffee_supply/session');
  });
});
