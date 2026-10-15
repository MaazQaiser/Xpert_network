# 0007 — Serve IBM Plex from /public via Carbon's font-face

- Status: Accepted · 2026-10-15 · Amended by ADR 0009 (UI font is now Inter; Plex Mono only)

## Context

Carbon's type styles reference the literal family `IBM Plex Sans`, so `next/font` (which renames families) doesn't work with them. Turbopack also doesn't support the `~` package prefix Carbon uses by default for font URLs.

## Decision

`scripts/copy-fonts.mjs` (run on `postinstall`) copies `@ibm/plex-sans` and `@ibm/plex-mono` woff2 files into `public/fonts` (git-ignored). `globals.scss` configures Carbon with `$font-path: '/fonts/plex'` and `$use-per-family-plex: true`, and disables Plex Serif.

## Consequences

Fonts load from our origin with `font-display: swap`. Run `pnpm install` (or the script) after cloning.
