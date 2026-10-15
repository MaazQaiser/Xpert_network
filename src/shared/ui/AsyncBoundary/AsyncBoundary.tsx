'use client';

import type { ReactNode } from 'react';
import { isApiError, toUserMessage } from '../../api';
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
  /** Shown instead of the error when the record doesn't exist (404); retrying wouldn't help. */
  notFound?: ReactNode;
  children: (data: T) => ReactNode;
};

/** Renders loading → error (with retry) → empty → success from one query (CLAUDE.md rule 6). */
export function AsyncBoundary<T>({
  query,
  loading,
  isEmpty,
  empty,
  errorTitle,
  notFound,
  children,
}: AsyncBoundaryProps<T>) {
  // Once data has loaded, keep showing it even if a background refetch fails
  // (UX_PRINCIPLES: "Partial — show what loaded").
  if (query.data === undefined && query.isPending) return <>{loading}</>;
  if (query.data === undefined) {
    if (notFound && isApiError(query.error) && query.error.status === 404) return <>{notFound}</>;
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
