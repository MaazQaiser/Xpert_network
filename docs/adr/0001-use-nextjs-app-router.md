# 0001 — Use Next.js App Router

- Status: Accepted · 2026-10-15

## Context

We need routing, layouts per role, and a path to server rendering when a real backend exists.

## Decision

Next.js (App Router, v16 at time of writing) with TypeScript `strict`. Route groups `(marketing)`, `(auth)`, `(client)`, `(expert)`, `(admin)`; pages stay thin and render feature components.

## Consequences

- Carbon components have no `'use client'` directive, so every file that renders Carbon is a client component; pages/layouts stay server components.
- Next 16 defaults to Turbopack and changes some conventions (see `AGENTS.md` and `node_modules/next/dist/docs`).
- `cacheComponents` is left off: the prototype is client-rendered against MSW, so it adds Suspense requirements without benefit.

## Alternatives

Vite + React Router (no SSR path), Remix.
