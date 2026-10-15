# 0003 — Feature-sliced folder structure

- Status: Accepted · 2026-10-15

## Decision

`app → features → shared`. Each feature exposes only `index.ts`. Enforced by ESLint: `import/no-restricted-paths` (shared can't import features/app/mocks; features can't import app or mocks) and `no-restricted-imports` (`@/features/*/*` deep imports are banned — use relative paths inside a feature).

## Exceptions

`features/prototype-toolbar` may import `@/mocks` because it drives the mock backend. `src/mocks` may import feature public APIs for types/schemas (it plays the backend).
