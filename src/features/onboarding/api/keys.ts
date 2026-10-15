export const onboardingKeys = {
  all: ['onboarding'] as const,
  taxonomy: () => [...onboardingKeys.all, 'taxonomy'] as const,
  client: () => [...onboardingKeys.all, 'client'] as const,
  expert: () => [...onboardingKeys.all, 'expert'] as const,
};
