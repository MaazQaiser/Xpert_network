'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api';
import { earningsSchema, type PayoutMethodInput } from '../model/earnings.schema';

export const earningsKeys = { all: ['earnings'] as const };

export function useEarnings() {
  return useQuery({
    queryKey: earningsKeys.all,
    queryFn: ({ signal }) => apiRequest('/earnings', { schema: earningsSchema, signal }),
  });
}

export function useSetPayoutMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PayoutMethodInput) =>
      apiRequest('/earnings/method', { method: 'PUT', body: input, schema: earningsSchema }),
    onSuccess: (earnings) => queryClient.setQueryData(earningsKeys.all, earnings),
  });
}

/** Requests everything available; the mock pays it via the toolbar's “Payout paid”. */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/earnings/payouts', { method: 'POST', schema: earningsSchema }),
    onSuccess: (earnings) => queryClient.setQueryData(earningsKeys.all, earnings),
  });
}
