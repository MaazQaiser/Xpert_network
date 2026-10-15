# 0011 — Inline notifications may shrink on 320px screens

- Status: Accepted · 2026-10-16
- Amends: CLAUDE.md non-negotiable 1, ADR 0010

## Context

Carbon v11 sets `min-inline-size: 18rem` (288px) on inline and actionable-inline notifications. On a 320px phone our pages have 16px gutters, so a notification inside any padded card or form is wider than its container and the page scrolls sideways — a WCAG 2.2 1.4.10 (Reflow) failure. The multi-size audit found it on the reset-password screen; ~45 notifications across the app were exposed to it. Patching each with a module class is noisy and easy to forget.

## Decision

`src/styles/_carbon-reflow.scss` sets `min-inline-size: 0` on `.cds--inline-notification` and `.cds--actionable-notification--inline`. Nothing else: colours, spacing and the maximum width stay Carbon's, and wider containers render exactly as before. It is the second (and only other) sanctioned stylesheet that touches Carbon internals, next to `_carbon-shape.scss`.

## Consequences

- Existing `.notice.notice { min-inline-size: 0 }` module rules are now redundant but harmless; new code doesn't need them for width.
- On Carbon upgrades, check whether the minimum is still there (Carbon may fix it) and delete this file if not.

## Alternatives

- A class on every notification: works, but 45+ call sites and every new one must remember it.
- A wrapper component: same effect with a bigger change to every feature.
