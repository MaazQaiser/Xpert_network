# 0008 — `exactOptionalPropertyTypes` off

- Status: Accepted · 2026-10-15

## Context

FRONTEND_STANDARDS §1 asked for `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. With `noUncheckedIndexedAccess`, Next's CSS-module typings make every `styles.x` `string | undefined`; with `exactOptionalPropertyTypes` that value can't be passed to any Carbon `className?: string` prop (nor to `fetch`'s `RequestInit`).

## Decision

Keep `strict` and `noUncheckedIndexedAccess`; turn `exactOptionalPropertyTypes` off.

## Alternatives

Generated `.d.ts` per SCSS module (typed-scss-modules) — revisit if we want the flag back.
