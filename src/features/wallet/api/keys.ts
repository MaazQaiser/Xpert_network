export const walletKeys = {
  all: ['wallet'] as const,
  current: () => [...walletKeys.all, 'current'] as const,
  packs: () => [...walletKeys.all, 'packs'] as const,
};
