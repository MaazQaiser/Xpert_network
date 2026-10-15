# 0009 — Proptyop look: Notion-like neutral themes, burnt-orange accent, Inter, floating panels

- Status: Accepted · 2026-10-15 · Revised 2026-10-16 (warm stone → Notion off-white, serif dropped, floating side nav)
- Amends: ADR 0002 (Carbon v11 design system), ADR 0007 (fonts)

## Context

Stakeholders want a calm, Notion-like feel — white page, soft grey panels, hairline borders, one warm accent, a single clean sans — instead of Carbon's default cool greys, IBM blue and Plex Sans. We still want Carbon's components, accessibility and token discipline. A first pass (warm stone background, Instrument Serif headings) was reviewed on 2026-10-16 and revised to this.

## Decision

- **Themes as Carbon tokens.** `src/styles/_themes.scss` defines a light and a dark override map. `proptyop-theme($mode)` first emits Carbon's own `white` / `g100` theme (so Carbon's component tokens — notifications, tags, … — keep their per-theme values; Carbon only resolves those for its built-in theme maps), then our overrides as `--cds-*` custom properties, then the button component tokens. `ThemeProvider` still switches `data-carbon-theme="white" | "g100"`.
- **Palette.** Light: page `#ffffff`, floating panels and cards `#f7f6f3`, hairlines `#edeceb`, text `#37352f`, secondary `#696862` (Notion's `#787774` fails AA at 4.48:1). Fields inside panels are white. Dark: page `#191919`, panels `#202020`, text `#e3e2e0`, secondary `#adacaa`. Accent burnt orange: buttons `#b4561f` (white text 4.9:1; the requested `#c8642b` fails at 3.95:1), links `#9a4a1b` light / `#e8925a` dark; focus and the active-nav bar use the accent.
- **Raw colours live only in `_themes.scss`** (stylelint override for that file and `_fonts.scss`). Everything else uses Carbon tokens.
- **Typography: Inter only.** Carbon's `$font-families` is configured in `globals.scss`: `sans` = Inter (variable, self-hosted from `@fontsource-variable/inter`, copied into `/public/fonts` by `scripts/copy-fonts.mjs`, `@font-face` in `src/styles/_fonts.scss`), `mono` = IBM Plex Mono (Carbon's `@font-face`). Plex Sans/Serif are off. Page and hero titles use `mixins.display-heading()` — a Carbon type token in semibold.
- **Floating chrome.** At `lg+` the side nav is an inset, rounded `$layer-01` panel (`AppShell` `.sideNav`, 16px gutter, `$border-radius-16`, soft `$shadow`) with the accent bar on the active item; the header has no bottom border and blends with the page. Content starts after `$pt-floating-nav-offset`. The doubled class selectors there only outrank Carbon's single-class root rules for these two shell elements — no Carbon internals are restyled. The admin realm keeps a `g100` header and Carbon's standard side nav (`AppShell chromeTheme`, `PublicShell variant="admin"`).
- **Cards.** Our own surfaces (hero tiles, auth card, onboarding and settings panels, live brief, chat bubbles) use `mixins.surface-card()` — `$border-radius-16`, hairline border, soft shadow. Card content sits in Carbon `<Layer>` so fields pick the right contextual tokens. Carbon buttons, inputs, tags and modals keep their square shapes (CLAUDE.md rule 1 unchanged).

## Consequences

- Every text pair was checked for WCAG 2.2 AA; axe runs on every documented screen in light and dark (screenshot pass) and in E2E.
- Carbon type metrics are tuned for Plex; with Inter, wrapping changes slightly. Long button labels on phones use the `flex: 1 1 0` pattern because Carbon sizes buttons to content (see `VerifyEmailNotice`, `SecurityPanel`, `OAuthButtons`, `LoginForm`).
- On phones the header shows the wallet as an icon only and drops the theme toggle (still in Settings → Appearance) so every header action fits at 320px.
- Upgrading Carbon: re-check `--cds-button-*`, theme token names, and the side-nav/header root rules the floating chrome overrides.

## Alternatives

- Warm stone background with Instrument Serif headings — built first, replaced after review (felt heavier than the Notion reference).
- Round every Carbon component — rejected for now: needs global overrides of Carbon internals and more upkeep on upgrades.
