import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../api';
import { AsyncBoundary, type AsyncQueryState } from './AsyncBoundary';

function query<T>(overrides: Partial<AsyncQueryState<T>>): AsyncQueryState<T> {
  return {
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

const renderBoundary = (state: AsyncQueryState<string[]>) =>
  render(
    <AsyncBoundary
      query={state}
      loading={<p>Loading skeleton</p>}
      isEmpty={(data) => data.length === 0}
      empty={<p>Nothing here yet</p>}
    >
      {(data) => <p>{data.join(', ')}</p>}
    </AsyncBoundary>,
  );

describe('AsyncBoundary', () => {
  it('shows the skeleton while loading', () => {
    renderBoundary(query({ isPending: true }));
    expect(screen.getByText('Loading skeleton')).toBeInTheDocument();
  });

  it('shows the user-safe error message and retries', async () => {
    const refetch = vi.fn();
    renderBoundary(
      query({
        isError: true,
        error: new ApiError(500, 'server_error', 'We couldn’t load briefs. Try again.'),
        refetch,
      }),
    );
    expect(screen.getByText('We couldn’t load briefs. Try again.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state', () => {
    renderBoundary(query({ data: [] }));
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('keeps showing loaded data when a background refetch fails', () => {
    renderBoundary(query({ data: ['Riyadh'], isError: true, error: new Error('boom') }));
    expect(screen.getByText('Riyadh')).toBeInTheDocument();
  });
});
