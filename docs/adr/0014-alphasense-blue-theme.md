# ADR 0014 — AlphaSense-style look: blue primary, flat pages, Plus Jakarta Sans headings

- **Status:** Accepted; surfaces, glass and shapes superseded by ADR 0015 (palette and fonts still apply)
- **Date:** 2026-10-22
- **Amends:** ADR 0009 (Xpert Network theme), ADR 0012 (side nav current-page marker)

## Context

Stakeholders chose [AlphaSense](https://www.alpha-sense.com/) as the visual reference: flat white pages, near-black text, one electric blue (`#0040ff`) for primary actions, and a geometric display face for headings (ES Klarheit, which is a paid font) with Inter for body text. The change applies to the whole system. Flows, content, data and layout stay as they are.

## Decision

- **Palette (`_themes.scss`).** Light: page, header, side nav and cards are `#ffffff`; quiet panels and fields are cool neutrals (`#f6f7f9` and up); hairlines are `#e4e7ec`; text is `#1d1d1d`, secondary `#5c6170`. Dark: deep navy, with page `#0b0e1a`, panels `#121628`, text `#e8eaf0` and secondary `#a3a9ba`. Token names and structure are unchanged.
- **Blue is the one brand colour.** Primary buttons, `$interactive`, links, the focus ring, `$highlight` and the current nav item are blue: `#0040ff` on light (white text 6.6:1), `#2550f0` primary and `#7c9cff` links and focus on dark. Secondary buttons are slate (`#3d4250`) and tertiary buttons keep the ink outline. The orange accent and black buttons are gone.
- **Flat surfaces.** `--pt-page-gradient` is `none`. The glass tokens are now solid: `--pt-glass-bg` is the page surface, `--pt-glass-border` a hairline, `--pt-glass-shadow` a soft 1px-offset shadow, and `--pt-glass-filter` `none`. The mixins (`surface-card`, `glass-fill`, `glass-chrome`) keep their names, so no component had to change.
- **Typography.** Headings use **Plus Jakarta Sans**, a free geometric face close to Klarheit. It is self-hosted from `@fontsource-variable/plus-jakarta-sans` and copied into `/public/fonts/jakarta` by `scripts/copy-fonts.mjs`. `h1`, `h2` and `mx.display-heading()` get `mx.display-face` (semibold, −0.02em tracking); `h3` gets −0.01em. Body text stays **Inter**, and sizes stay Carbon type tokens.
- **Shell.** The admin console no longer uses the `g100` chrome. Every role gets the same light (or navy) header and side nav, with a hairline under the header. The current nav item is a blue tint with a blue label and icon (`_carbon-side-nav.scss`). The admin login page keeps its dark `PublicShell` header for now.

## Consequences

- Every text pair was checked for WCAG 2.2 AA (2026-10-22). Strong borders stay ≥ 3:1.
- The admin realm is now recognisable only by the "Admin" suffix and its own navigation. If staff need a stronger cue, revisit this.
- Charts (`@carbon/charts`) still use Carbon's own palettes.
