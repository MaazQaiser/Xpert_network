# 0012 — Side nav items get room and a minimal current-page marker

- Status: Superseded by ADR 0015 (2026-10-22) · was Accepted 2026-10-16
- Amends: CLAUDE.md non-negotiable 1, ADR 0010, ADR 0011

## Context

Carbon's UI Shell side nav sets each link to a fixed 2rem (32px) with no gap between rows and marks the current page with a full-width fill plus a 3px `$border-interactive` bar on the left edge. Against our Notion-like glass chrome (ADR 0009) the rows read as cramped and the orange edge bar is louder than anything else in the nav. Carbon exposes no prop or token for link height, list spacing or the current-page bar, and `SideNavLink` renders the anchor itself, so a module class can't reach it without deep selectors.

## Decision

`src/styles/_carbon-side-nav.scss` restyles only:

- `.cds--side-nav__items`: a flex column with a `$spacing-02` gap and `$spacing-05 $spacing-03` padding, so items sit inset from the nav's edges.
- `a.cds--side-nav__link`: `$spacing-08` (40px) tall, matching our `md` buttons and fields, with `$spacing-04` inline padding and 8px corners (`$border-radius-08`, as in ADR 0010).
- The current-page `::before` bar is removed. Carbon's own `$background-selected` fill and semibold text stay, and they are the whole indicator.
- The focus ring shows on keyboard focus (`:focus-visible`) only; Carbon draws it on any `:focus`, so a mouse click used to leave a dark outline on the clicked link.

Colours, focus ring, icons and type stay Carbon's. It applies to every side nav (client, expert, admin), so they look the same.

## Consequences

- This is the third sanctioned stylesheet that touches Carbon internals, next to `_carbon-shape.scss` and `_carbon-reflow.scss`.
- On Carbon upgrades, check that the selectors still match (`a.cds--side-nav__link`, `[aria-current='page']::before`).

## Alternatives

- `SideNavLink large`: 48px rows, but no gap, inset or rounded shape, and the edge bar stays.
- A custom nav built from links: loses Carbon's overlay, focus and rail behaviour for a visual tweak.
