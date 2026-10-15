'use client';

import type { ReactNode } from 'react';
import { toUserMessage } from '../../api';
import { ErrorState } from '../ErrorState/ErrorState';

/** The subset of a TanStack Query result this boundary needs. */
export type AsyncQueryState<T> = {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
};

export type AsyncBoundaryProps<T> = {
  query: AsyncQueryState<T>;
  /** Skeleton matching the final layout — never a full-page spinner. */
  loading: ReactNode;
  /** Return true when the data should render the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  errorTitle?: string;
  children: (data: T) => ReactNode;
};

/** Renders loading → error (with retry) → empty → success from one query (CLAUDE.md rule 6). */
export function AsyncBoundary<T>({
  query,
  loading,
  isEmpty,
  empty,
  errorTitle,
  children,
}: AsyncBoundaryProps<T>) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError || query.data === undefined) {
    return (
      <ErrorState
        {...(errorTitle ? { title: errorTitle } : {})}
        message={toUserMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
