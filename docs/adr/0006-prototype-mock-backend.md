# 0006 — Front-end prototype: MSW + fixtures + scripted AI behind `shared/api`

- Status: Accepted · 2026-10-15

## Decision

- Components call feature hooks → `shared/api` (`apiRequest`, `streamEvents`) → `fetch('/api/…')`.
- MSW (`src/mocks/browser.ts`) intercepts in the browser; `src/mocks/node.ts` serves the same handlers to Vitest.
- State lives in `src/mocks/store/db.ts` (in-memory, persisted to `localStorage`, `reset()`).
- AI is scripted (`src/mocks/ai/*`) and streamed as NDJSON events (`step`, `token`, `done`, `error` — `src/shared/ai/protocol.ts`). Turns carry a client `turnId` so retries are idempotent.
- Prototype toggles (`src/mocks/controls.ts`) inject latency, errors, empty data, low credits and coverage scenarios.

## Consequences

- MSW's browser build can't load during SSR; `next.config.ts` aliases `@/mocks/browser` to a no-op stub for non-browser targets.
- The worker starts once per page (`MockProvider`), before the app renders.
- HMR re-creates mock modules but not the running worker; reload the page after editing `src/mocks`.
- Swapping to a real API means replacing `src/mocks` and `MockProvider` only.
