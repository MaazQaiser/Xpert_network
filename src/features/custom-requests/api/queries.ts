'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { libraryKeys } from '@/features/library';
import { walletKeys } from '@/features/wallet';
import { apiRequest } from '@/shared/api';
import {
  customRequestSchema,
  type CustomRequest,
  type DeclineInput,
} from '../model/request.schema';

export const requestKeys = {
  all: ['requests'] as const,
  list: () => [...requestKeys.all, 'list'] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export function useRequests() {
  return useQuery({
    queryKey: requestKeys.list(),
    queryFn: ({ signal }) =>
      apiRequest('/requests', { schema: z.array(customRequestSchema), signal }),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/requests/${id}`, { schema: customRequestSchema, signal }),
  });
}

/** One mutation per action; each returns the updated request and refreshes what it touches. */
function useRequestAction<TInput = void>(
  id: string,
  path: string,
  { touchesWallet = false }: { touchesWallet?: boolean } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TInput) =>
      apiRequest(`/requests/${id}/${path}`, {
        method: 'POST',
        body: body ?? undefined,
        schema: customRequestSchema,
      }),
    onSuccess: (request: CustomRequest) => {
      queryClient.setQueryData(requestKeys.detail(id), request);
      void queryClient.invalidateQueries({ queryKey: requestKeys.list() });
      if (touchesWallet) void queryClient.invalidateQueries({ queryKey: walletKeys.all });
      if (request.delivery) void queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });
}

export const useAcceptQuote = (id: string) =>
  useRequestAction(id, 'accept', { touchesWallet: true });
export const useDeclineQuote = (id: string) => useRequestAction<DeclineInput>(id, 'decline');
export const useRequote = (id: string) => useRequestAction(id, 'requote');
export const useCancelRequest = (id: string) =>
  useRequestAction(id, 'cancel', { touchesWallet: true });
export const useSendRequestMessage = (id: string) =>
  useRequestAction<{ text: string }>(id, 'messages');
export const useRateDelivery = (id: string) => useRequestAction<{ rating: number }>(id, 'rate');
