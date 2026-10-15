'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/shared/api';
import { creditPackSchema, walletSchema, type TopUpInput } from '../model/wallet.schema';
import { walletKeys } from './keys';

export function useWallet() {
  return useQuery({
    queryKey: walletKeys.current(),
    queryFn: ({ signal }) => apiRequest('/wallet', { schema: walletSchema, signal }),
  });
}

export function useCreditPacks() {
  return useQuery({
    queryKey: walletKeys.packs(),
    queryFn: ({ signal }) => apiRequest('/wallet/packs', { schema: z.array(creditPackSchema), signal }),
    staleTime: Infinity, // Static catalogue.
  });
}

/** Mock checkout for a credit pack (F6). */
export function useTopUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TopUpInput) =>
      apiRequest('/wallet/top-up', { method: 'POST', body: input, schema: walletSchema }),
    onSuccess: (wallet) => queryClient.setQueryData(walletKeys.current(), wallet),
  });
}
