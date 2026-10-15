import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { expectNoAxeViolations } from '@/test/axe';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title, help text and single action', async () => {
    const { container } = render(
      <EmptyState
        title="No briefs yet"
        description="Describe a goal to start."
        action={<button type="button">Start</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No briefs yet', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
