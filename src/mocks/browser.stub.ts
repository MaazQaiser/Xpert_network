// Server-side stand-in for ./browser.ts: MSW's browser build can't load during SSR.
// Aliased in next.config.ts (turbopack.resolveAlias) for non-browser targets.
export const worker = {
  start: async () => undefined,
};
