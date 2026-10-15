'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionKeys } from '@/features/auth';
import { apiRequest } from '@/shared/api';
import {
  clientOnboardingSchema,
  type ClientOnboarding,
  type ClientOnboardingPatch,
} from '../model/client.schema';
import {
  expertOnboardingSchema,
  type ExpertOnboarding,
  type ExpertStep,
  type ExpertStepInput,
} from '../model/expert.schema';
import { taxonomySchema } from '../model/taxonomy.schema';
import { onboardingKeys } from './keys';

export function useTaxonomy() {
  return useQuery({
    queryKey: onboardingKeys.taxonomy(),
    queryFn: ({ signal }) => apiRequest('/onboarding/taxonomy', { schema: taxonomySchema, signal }),
    staleTime: 10 * 60_000,
  });
}

// ——— Client (F1) ———————————————————————————————————————————————————

export function useClientOnboarding({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: onboardingKeys.client(),
    queryFn: ({ signal }) =>
      apiRequest('/onboarding/client', { schema: clientOnboardingSchema, signal }),
    enabled,
  });
}

export function useUpdateClientOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ClientOnboardingPatch) =>
      apiRequest('/onboarding/client', {
        method: 'PATCH',
        body: patch,
        schema: clientOnboardingSchema,
      }),
    onSuccess: (next, patch) => {
      queryClient.setQueryData<ClientOnboarding>(onboardingKeys.client(), next);
      // Job title and organisation also update the user record.
      if (patch.about) void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

// ——— Expert (F7) ———————————————————————————————————————————————————

export function useExpertOnboarding({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: onboardingKeys.expert(),
    queryFn: ({ signal }) =>
      apiRequest('/onboarding/expert', { schema: expertOnboardingSchema, signal }),
    enabled,
  });
}

function useSetExpert() {
  const queryClient = useQueryClient();
  return (next: ExpertOnboarding) =>
    queryClient.setQueryData<ExpertOnboarding>(onboardingKeys.expert(), next);
}

export function useSaveExpertStep() {
  const setExpert = useSetExpert();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpertStepInput) =>
      apiRequest('/onboarding/expert/steps', {
        method: 'PUT',
        body: input,
        schema: expertOnboardingSchema,
      }),
    onSuccess: (next, input) => {
      setExpert(next);
      if (input.step === 'basics')
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useGoToExpertStep() {
  const setExpert = useSetExpert();
  return useMutation({
    mutationFn: (currentStep: ExpertStep) =>
      apiRequest('/onboarding/expert', {
        method: 'PATCH',
        body: { currentStep },
        schema: expertOnboardingSchema,
      }),
    onSuccess: setExpert,
  });
}

export function useSubmitExpertProfile() {
  const setExpert = useSetExpert();
  return useMutation({
    mutationFn: () =>
      apiRequest('/onboarding/expert/submit', { method: 'POST', schema: expertOnboardingSchema }),
    onSuccess: setExpert,
  });
}

export function useReopenExpertProfile() {
  const setExpert = useSetExpert();
  return useMutation({
    mutationFn: () =>
      apiRequest('/onboarding/expert/reopen', { method: 'POST', schema: expertOnboardingSchema }),
    onSuccess: setExpert,
  });
}
