# 0010 — 8px corners on buttons and form fields

- Status: Superseded by ADR 0015 (2026-10-22) · was Accepted 2026-10-16
- Amends: CLAUDE.md non-negotiable 1 ("never restyle Carbon internals"), ADR 0009

## Context

The Xpert Network look (ADR 0009) uses soft, rounded surfaces. Stakeholders asked for 8px corners on buttons and input fields to match. Carbon v11 exposes a supported radius hook for buttons (`--cds-button-radius`) but none for form fields; its only rounded-field styling is behind the unreleased `enable-v12-release` flag, at a fixed 4px.

## Decision

- **Buttons:** `--cds-button-radius: $border-radius-08`, set with the other button tokens in `src/styles/_themes.scss`. Every Carbon button (including header actions and modal close) follows; no Carbon internals are touched.
- **Fields:** `src/styles/_carbon-shape.scss` is the **one** sanctioned stylesheet that restyles Carbon internal classes, and only for shape: text input, password input, text area, select, date picker, number input and the list box behind Dropdown / ComboBox / (Filterable)MultiSelect get `$border-radius-08` and a full 1px `$border-strong` border. Read-only text inputs keep Carbon's subtle edge on all sides; an open list box squares the edge it shares with its menu.
- **Accessibility:** a rounded field with Carbon's bottom-only underline looks broken and loses its boundary, so fields get a whole outline in `$border-strong` (≥ 3:1, WCAG 1.4.11). Focus and invalid outlines are Carbon's and follow the radius.
- CLAUDE.md rule 1 now reads: never restyle Carbon internals with deep selectors — except the field-shape rules in `_carbon-shape.scss`. Anything else still composes or wraps.

## Consequences

- On Carbon upgrades, re-check the field class names and that Carbon hasn't shipped a field-radius token (then switch to it and delete the overrides).
- New field types used later (e.g. Search, TimePicker) must be added to `_carbon-shape.scss`, not styled in feature modules.

## Alternatives

- Turn on `enable-v12-release`: brings unreleased v12 changes app-wide and only gives 4px.
- Keep fields square with rounded buttons: rejected by stakeholders.

## Revision 2026-10-16

Search inputs and the content switcher now get the same 8px radius and 1px `$border-strong` outline as other fields, so filter rows read as one set of controls (`_carbon-shape.scss`). Focus rings are slate, not orange (ADR 0009).

One colour exception lives here too: checkboxes and radios remap `--cds-icon-primary` to the slate `--pt-control-edge` so their edge matches the slate field outlines (ADR 0009). It changes a token inside the component, not its shape or structure.
