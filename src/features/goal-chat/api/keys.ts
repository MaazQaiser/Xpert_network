export const briefKeys = {
  all: ['briefs'] as const,
  list: () => [...briefKeys.all, 'list'] as const,
  conversation: (briefId: string) => [...briefKeys.all, 'conversation', briefId] as const,
  coverage: (briefId: string) => [...briefKeys.all, 'coverage', briefId] as const,
};
