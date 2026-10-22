# ADR 0013 — Living design system page with runtime token overrides

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Designers and PMs want one place to see every colour, type style and component the app uses, and to try token changes without editing Sass. Carbon v11 compiles its components against CSS custom properties (`var(--cds-…)`), including type styles (`--cds-<token>-font-size`, `-line-height`, `-font-weight`) and `--cds-button-radius`, so a value set on `<html>` restyles every Carbon component.

## Decision

- `/design-system` (`src/features/design-system`) renders colour tokens, the type scale, spacing and radius, and a gallery of every Carbon and `src/shared/ui` component in use — all from the live theme.
- Edits are stored in localStorage (`xpert.design-tokens`, Zod-validated) and written into one `<style>` tag by `DesignTokenOverrides`, mounted in the root layout so every screen gets them. Selectors are `html:root…`, which outrank the theme blocks in `globals.scss` without `!important`.
- Colour edits are per theme (light / dark); type and radius edits apply to both.
- Values are restricted to colour/number characters so nothing can escape the stylesheet.
- Field radius and border width in `_carbon-shape.scss` read `--pt-field-radius` and `--pt-field-border-width`. Card radius and shadow read `--pt-card-radius` and `--pt-glass-shadow` via `surface-card`.
- The **Components** tab lists the tokens each specimen uses (buttons, fields, tabs, notifications, and so on) so you can edit corner radius, shadows and colours in context.
- Edits are **local and temporary**. "Export changes" produces the snippet to commit into `src/styles/_themes.scss`, which stays the only source of committed colour values (ADR 0009).

## Consequences

- Trying a palette or type change takes seconds and shows across the real flows.
- Spacing is compiled into Carbon as literals, so the page shows it but can't edit it.
- Carbon `<Theme>` zones (admin header, prototype toolbar) set their own tokens and ignore root overrides.
- Contrast is checked live against `$background` (or `$text-on-color` for buttons); a failing edit shows a "fails" tag but is not blocked, so designers can explore.
