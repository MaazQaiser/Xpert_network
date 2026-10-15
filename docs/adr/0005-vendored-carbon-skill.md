# 0005 — Vendor the `carbon` reference skill

- Status: Accepted · 2026-10-15

## Decision

`.claude/skills/carbon` is a pinned copy of iamursky/carbon-skill (commit in `PINNED.md`). Update only alongside a Carbon version bump.

## Consequences

Some component pages (e.g. UIShell, ProgressIndicator) don't include prop tables; for those, check the installed package's `.d.ts` files or Storybook.
