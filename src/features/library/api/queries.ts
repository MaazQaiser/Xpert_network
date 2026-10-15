'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletKeys } from '@/features/wallet';
import { apiRequest } from '@/shared/api';
import {
  filtersToParams,
  libraryEntrySchema,
  libraryListSchema,
  purchaseResultSchema,
  reportSchema,
  type LibraryEntry,
  type LibraryFilters,
} from '../model/report.schema';

export const libraryKeys = {
  all: ['library'] as const,
  list: (filters: LibraryFilters) => [...libraryKeys.all, 'list', filters] as const,
  entry: (id: string) => [...libraryKeys.all, 'entry', id] as const,
  report: (id: string) => [...libraryKeys.all, 'report', id] as const,
};

export function useLibrary(filters: LibraryFilters) {
  return useQuery({
    queryKey: libraryKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest(`/library?${filtersToParams(filters, 'cards').toString()}`, {
        schema: libraryListSchema,
        signal,
      }),
    placeholderData: (previous) => previous,
  });
}

export function useLibraryEntry(id: string) {
  return useQuery({
    queryKey: libraryKeys.entry(id),
    queryFn: ({ signal }) => apiRequest(`/library/${id}`, { schema: libraryEntrySchema, signal }),
  });
}

export function useReport(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: libraryKeys.report(id),
    queryFn: ({ signal }) => apiRequest(`/library/${id}/content`, { schema: reportSchema, signal }),
    enabled,
  });
}

export function usePurchaseReport(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/library/${id}/purchase`, { method: 'POST', schema: purchaseResultSchema }),
    onSuccess: ({ entry }) => {
      queryClient.setQueryData<LibraryEntry>(libraryKeys.entry(id), entry);
      void queryClient.invalidateQueries({ queryKey: [...libraryKeys.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}
