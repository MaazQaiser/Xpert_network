import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { LibraryBrowser } from './LibraryBrowser';

describe('LibraryBrowser (F3)', () => {
  it('shows shelves by industry, with owned reports marked', async () => {
    mockLocation.pathname = '/library';
    const { container } = renderWithProviders(<LibraryBrowser />, { persona: 'bilal' });

    expect(await screen.findByRole('heading', { name: /Food & beverage/ })).toBeInTheDocument();
    expect(screen.getByText('10 reports')).toBeInTheDocument();
    const owned = screen.getByRole('link', {
      name: 'Dubai high-street and mall rents for F&B, 2026',
    });
    expect(owned).toHaveAttribute('href', '/library/lib_dubai_rents/read');
    await expectNoAxeViolations(container);
  });

  it('keeps the search in the URL and shows matching reports flat', async () => {
    mockLocation.pathname = '/library';
    mockLocation.search = '?q=qahwa&maxPrice=200';
    renderWithProviders(<LibraryBrowser />, { persona: 'ayesha' });

    expect(await screen.findByText('1 reports')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Matching reports' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/library', { scroll: false });
  });

  it('offers to scope research when nothing matches', async () => {
    mockLocation.pathname = '/library';
    mockLocation.search = '?q=zanzibar';
    setControls({ emptyData: false });
    renderWithProviders(<LibraryBrowser />, { persona: 'ayesha' });

    expect(await screen.findByText('No reports match these filters')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Describe what you need' })).toHaveAttribute(
      'href',
      '/ask',
    );
  });

  it('shows the error state with a retry', async () => {
    setControls({ apiError: true });
    renderWithProviders(<LibraryBrowser />, { persona: 'ayesha' });
    expect(await screen.findByText('The library didn’t load')).toBeInTheDocument();
    setControls({ apiError: false });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByText('10 reports')).toBeInTheDocument());
  });
});
