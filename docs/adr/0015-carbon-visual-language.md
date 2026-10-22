# ADR 0015 — Carbon's own visual language across the whole system

- **Status:** Accepted
- **Date:** 2026-10-22
- **Supersedes:** ADR 0010 (rounded buttons and fields), ADR 0012 (side nav rhythm), and the surface, glass and shape parts of ADR 0009 and ADR 0014
- **Keeps:** ADR 0014's blue primary palette and typography (Plus Jakarta Sans headings, Inter body)

## Context

Stakeholders want the product to look like the Carbon Design System everywhere, not like a custom look that happens to use Carbon components underneath. The previous direction layered our own shape and surface treatment over Carbon: rounded buttons and fields, rounded and glassy cards, pill chips, a glowing animated message box and a restyled side nav.

## Decision

- **Shape.** Carbon's defaults throughout. Buttons are square (`--cds-button-radius: 0`). Form fields keep Carbon's own field style (fill and bottom border), so `src/styles/_carbon-shape.scss` is removed. Feature styles no longer set rounded corners. Circles (avatars, status dots, the notification count) stay round, as they are in Carbon.
- **Surfaces.** `mixins.surface-card` and `glass-fill` now draw Carbon's tile look: the `$layer-01` fill, square corners, no border, no shadow and no blur. The page has no gradient. The surface tokens (`--pt-glass-*`, `--pt-card-radius`) stay so the design system page can still override them at runtime (ADR 0013). The field-shape controls on that page were removed with the override they drove.
- **Shell.** The header and side nav use Carbon's UI Shell styling unchanged, including Carbon's current-page indicator, so `src/styles/_carbon-side-nav.scss` is removed. `glass-chrome` is gone.
- **Components over custom pieces.** Prefer Carbon components for new and reworked UI: `Tile`, `ClickableTile` and `Layer` for panels and cards, Carbon `Link` for inline links, Carbon buttons for suggestions. The admin Home uses these.
- **Message box.** `FloatingComposer` uses Carbon's field look: the field fill, a strong bottom border, square corners and Carbon's 2px focus outline. The orbiting rim and breathing glow are removed.
- **Quick suggestions.** Suggestion chips (admin Home, client chat) are Carbon ghost buttons on a `$layer-01` fill. Tertiary's ink outline and black hover read too heavy for this use.
- **Kept.** The blue primary and navy dark theme (ADR 0014), the fonts (ADR 0014), and the admin Home mascot and its state animations.

## Consequences

- Every screen inherits the change from `_themes.scss` and `_mixins.scss`. Per-screen rounded corners were removed in one sweep.
- CLAUDE.md non-negotiable 1 is back to its strict form. The only sanctioned Carbon-internal restyle left is notification reflow (ADR 0011).
- If a softer look is wanted later, it should come through Carbon's own tokens and theming, not by restyling component shapes.
