# 0004 — TanStack Query for server state

- Status: Accepted · 2026-10-15

## Decision

All server state through TanStack Query with per-feature key factories (`briefKeys`, `walletKeys`, `sessionKeys`). Default `staleTime` 30s; no retries for 4xx. Login/logout clear the cache (it belongs to the previous user).

## Consequences

`AsyncBoundary` renders loading/empty/error/success from a query and keeps showing loaded data if a background refetch fails.
