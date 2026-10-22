import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { RequestSession } from './RequestSession';

describe('Interview session', () => {
  it('shows the request and walks questions one at a time', async () => {
    const { container } = renderWithProviders(<RequestSession callId="call_ksa_coffee_supply" />, {
      persona: 'sara',
    });

    expect(
      await screen.findByRole('heading', {
        name: 'Specialty coffee supply chains in Saudi Arabia',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Specialty coffee · Procurement & sourcing · Supplier negotiation · Import lead times & customs',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Switch to chat' }));

    const first = screen.getByRole('heading', { level: 2 });
    const firstQuestion = first.textContent ?? '';
    expect(firstQuestion.length).toBeGreaterThan(0);
    expect(screen.getByText('Question 1 of 12')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Your answer'), 'Importers set the landed price.');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(firstQuestion);
    expect(screen.getByText('Question 2 of 12')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Question 3 of 12')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
