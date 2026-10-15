# 0002 — Carbon v11 as the design system

- Status: Accepted · 2026-10-15

## Decision

`@carbon/react`, icons, pictograms and charts. Themes `white` (default) and `g100` (dark), set on `<html data-carbon-theme>` by `ThemeProvider`; the UI Shell header always uses `g100`. Styling only through Carbon Sass tokens, enforced by `stylelint-plugin-carbon-tokens`.

## Consequences

Product components wrap Carbon in `src/shared/ui`. Shell geometry Carbon doesn't export (header height, side-nav width) lives in `src/styles/_tokens.scss`.
