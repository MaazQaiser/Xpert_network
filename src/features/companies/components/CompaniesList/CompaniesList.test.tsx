import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { CompaniesList } from './CompaniesList';

describe('CompaniesList', () => {
  it('lists catalogue companies and links each one to the library', async () => {
    const { container } = renderWithProviders(<CompaniesList />, { persona: 'ayesha' });

    const qahwa = await screen.findByRole('link', { name: /Qahwa House/ });
    expect(qahwa).toHaveAttribute('href', '/library?q=Qahwa%20House');
    expect(screen.getByRole('link', { name: /Bayt Burger/ })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
