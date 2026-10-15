# 0009 — Proptyop look: warm stone themes, burnt-orange accent, Inter + Instrument Serif

- Status: Accepted · 2026-10-15
- Amends: ADR 0002 (Carbon v11 design system), ADR 0007 (fonts)

## Context

Stakeholders want a calmer, editorial, Notion-like feel (warm stone backgrounds, soft cards, a serif for big headings, an orange accent) instead of Carbon's default cool greys, IBM blue and Plex Sans. We still want Carbon's components, accessibility and token discipline.

## Decision

- **Themes as Carbon tokens.** `src/styles/_themes.scss` defines a light and a dark override map. `proptyop-theme($mode)` first emits Carbon's own `white` / `g100` theme (so Carbon's component tokens — notifications, tags, … — keep their per-theme values; Carbon only resolves those for its built-in theme maps), then our overrides as `--cds-*` custom properties, then the button component tokens. `ThemeProvider` still switches `data-carbon-theme="white" | "g100"`.
- **Palette.** Light: page `#efebe6` (stone), cards and fields `#faf8f5` (paper), text `#2b2824`, secondary `#5e5851`. Dark: page `#1c1a17`, text `#ece7e0`, secondary `#b8b1a7`. Accent burnt orange: buttons `#b4561f` (white text 4.9:1), links `#9a4a1b` light / `#e8925a` dark, focus and active nav in the accent. The requested `#c8642b` failed AA with white text (3.95:1), so the button uses a deeper shade.
- **Raw colours live only in `_themes.scss`** (stylelint override for that file and `_fonts.scss`). Everything else keeps using Carbon tokens.
- **Typography.** Carbon's `$font-families` is configured in `globals.scss`: `sans` = Inter (variable), `serif` = Instrument Serif, `mono` = IBM Plex Mono. Plex Sans/Serif `@font-face` is turned off; Plex Mono keeps Carbon's. Inter and Instrument Serif are self-hosted from `@fontsource*` packages, copied into `/public/fonts` by `scripts/copy-fonts.mjs`, with `@font-face` in `src/styles/_fonts.scss`.
- **Serif only for display headings** (page titles, hero and marketing headings, status-page titles) through `mixins.display-heading()`. CSS modules compile without the global font config, so the serif stack reaches them as `--pt-font-display`. Section/component headings and all UI text stay in Inter.
- **Shape.** Our own surfaces (hero tiles, auth card, onboarding and settings panels, live brief, chat bubbles) use `mixins.surface-card()` — `$border-radius-16`, subtle border, soft `$shadow`. Carbon buttons, inputs, tags and modals keep their square shapes; we don't restyle Carbon internals (CLAUDE.md rule 1 unchanged). Card content sits in Carbon `<Layer>` so fields pick the right contextual tokens.
- **Shell.** Header and side nav use the app theme (light warm, or warm dark). The active nav item gets the accent bar via `$border-interactive`. The admin realm keeps a `g100` header (`AppShell chromeTheme`, `PublicShell variant="admin"`) so staff always know where they are.

## Consequences

- Every text pair was checked for WCAG 2.2 AA; axe runs on every screen in both themes (light and dark) via the screenshot pass, and in E2E.
- Carbon type metrics are tuned for Plex; with Inter, line lengths and wrapping change slightly. Long button labels on phones need the `flex: 1 1 0` pattern (Carbon sizes buttons to content), see `VerifyEmailNotice`, `SecurityPanel`, `OAuthButtons`, `LoginForm`.
- On phones the header shows the wallet as an icon only and drops the theme toggle (still in Settings → Appearance) so all header actions fit at 320px.
- Upgrading Carbon: re-check that `--cds-button-*` and the theme token names still exist.

## Alternatives

- Keep Plex Sans and add Plex Serif — smaller change, but further from the requested look.
- Round every Carbon component — rejected for now: needs global overrides of Carbon internals and more upkeep on upgrades.
