'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api';
import { sessionSchema } from '../model/session.schema';
import { sessionKeys } from './keys';

export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: ({ signal }) => apiRequest('/session', { schema: sessionSchema, signal }),
    staleTime: Infinity, // Changes only through login/logout mutations, which update the cache.
  });
}
