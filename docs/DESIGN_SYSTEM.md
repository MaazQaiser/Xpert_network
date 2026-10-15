# Proptyop Design System — built on IBM Carbon v11

Carbon is our foundation. This doc defines **how Proptyop uses Carbon**: which themes, tokens, components and patterns, plus the small set of product-specific extensions we allow.

References: **`carbon` skill** (`.claude/skills/carbon` — exact component/Sass/token API, read before coding) · carbondesignsystem.com · react.carbondesignsystem.com (Storybook) · Carbon for AI guidelines.

> This doc is **policy** (what Proptyop allows). For **API facts** (props, Sass module paths, token names), the `carbon` skill is authoritative — e.g. `references/elements/themes.md`, `references/elements/layout.md`, `references/react/components/AILabel.md`.

---

## 1. Principles

1. **Clarity over decoration.** Research content is dense; the UI should recede and let the content lead.
2. **Productive by default, expressive by exception.** Use Carbon's *productive* type and motion everywhere in the app. *Expressive* styles are only for marketing pages and empty-state hero moments.
3. **One way to do a thing.** If two screens solve the same problem, they use the same pattern.
4. **Tokens, not values.** Every colour, space, size and duration comes from a Carbon token.
5. **Extend, don't fork.** Product components wrap Carbon; they never copy and modify Carbon source.

---

## 2. Setup

```bash
pnpm add @carbon/react @carbon/icons-react @carbon/pictograms-react @carbon/charts-react sass
```

`src/styles/globals.scss`

See `src/styles/globals.scss`: Carbon config → `$font-families` (Inter / Instrument Serif / Plex Mono) → `@font-face` (`_fonts.scss`) → `@carbon/react` → Proptyop themes (`_themes.scss`). Details and reasons in ADR 0009.

Next.js notes:

- Import `globals.scss` once in `app/layout.tsx`.
- Carbon interactive components need `'use client'`. Put them in `src/shared/ui/*` client wrappers or in feature `components/` that are client components; keep pages/layouts as Server Components.
- Wrap the app in a client `<ThemeProvider>` that renders Carbon's `<Theme theme="...">`.
- Fonts are self-hosted from `/public/fonts` (copied on `postinstall`); `next/font` can't be used because Carbon's type styles reference literal family names (ADR 0007, 0009).

---

## 3. Themes

| Area | Carbon theme | Why |
|---|---|---|
| App (default, light) | `white` + Proptyop warm overrides | Warm stone page, paper cards, burnt-orange accent (ADR 0009) |
| App alt surfaces (side panels, filters) | `g10` layer | Subtle separation |
| Dark mode | `g100` + Proptyop warm overrides | User preference / system setting |
| UI Shell header + side nav | App theme (light or dark) | Calm, Notion-like frame; accent bar marks the active item |
| Admin header | `g100` (Carbon) | Separate realm must look different |

- Theme follows `prefers-color-scheme`, overridable in user settings (persisted server-side).
- Never hard-code a colour. Raw values live only in `src/styles/_themes.scss`; add a token there (light and dark, AA-checked) rather than in a component. Test every screen in both themes.
- Use **layering tokens** (`$layer-01/02/03`, `$layer-accent-*`, `$border-subtle-*`) and Carbon's `<Layer>` component to nest surfaces — don't pick background colours manually.

---

## 4. Tokens

### 4.1 Colour (use semantic tokens only)

| Need | Token |
|---|---|
| Page background | `$background` |
| Cards / tiles / panels | `$layer-01` → `$layer-02` when nested |
| Primary text / secondary / helper | `$text-primary` / `$text-secondary` / `$text-helper` |
| Primary actions, links | `$interactive`, `$link-primary`, `$button-primary` |
| Focus | `$focus` (never remove focus rings) |
| Status | `$support-error`, `$support-success`, `$support-warning`, `$support-info` |
| Borders | `$border-subtle-01`, `$border-strong-01` |

Status must **never rely on colour alone** — pair with icon + text (Carbon `Tag`, `InlineNotification`, status icons).

### 4.2 Proptyop extension tokens (`src/styles/_tokens.scss`)

Only add tokens here when Carbon has no semantic equivalent. Each must map to a Carbon palette value and have both light and dark values.

```scss
// Research-domain semantics, mapped to Carbon palette
$pt-request-open:      $support-info;
$pt-request-progress:  $support-warning;
$pt-request-delivered: $support-success;
$pt-confidence-high:   $support-success;
$pt-confidence-low:    $support-warning;
```

AI-specific styling uses Carbon's own AI tokens (`$ai-*`, AI gradients/aura) — see `AI_NATIVE.md`. Don't invent AI colours.

### 4.3 Spacing — `$spacing-01 … $spacing-13`

`2 · 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 160 px`

Rules of thumb:

- Inside components: `$spacing-03`–`$spacing-05`.
- Between related groups: `$spacing-06`–`$spacing-07`.
- Between page sections: `$spacing-09`+.

### 4.4 Typography — Inter, Instrument Serif, Plex Mono

- UI and body: **Inter** (Carbon `sans`). Display headings: **Instrument Serif** (Carbon `serif`), only via `@include mx.display-heading('heading-06')` for page titles, hero and marketing headings. Code: **IBM Plex Mono**.
- Section, card and component headings stay in Inter so dense screens scan quickly.

### 4.4.1 Surfaces

- Our own containers (hero tiles, panels, auth card, onboarding/settings cards, chat bubbles) use `@include mx.surface-card` — `$border-radius-16`, `$border-subtle-01` border, soft `$shadow`. Put form content inside Carbon `<Layer>` so fields use the right contextual tokens.
- Carbon buttons, inputs, tags and modals keep Carbon's shapes — don't restyle their internals.

Use `@include type-style('<token>')`. Productive set for the app:

| Use | Token |
|---|---|
| Page title | `heading-05` (one per page) |
| Section heading | `heading-04` / `heading-03` |
| Card / panel title | `heading-02` |
| Body (UI) | `body-01` |
| Long-form reading (reports, transcripts) | `body-02`, max line length ~70ch |
| Labels, helper text | `label-01`, `helper-text-01` |
| Code / IDs / citations | `code-01`, `code-02` (Plex Mono) |

Heading levels in HTML (`h1`–`h6`) must follow document order independent of visual style.

### 4.5 Grid & layout — Carbon 2x Grid

| Breakpoint | Min width | Columns |
|---|---|---|
| `sm` | 320 | 4 |
| `md` | 672 | 8 |
| `lg` | 1056 | 16 |
| `xlg` | 1312 | 16 |
| `max` | 1584 | 16 |

- Use `<Grid>` / `<Column>` (CSS Grid) — not the legacy flex grid.
- Use `@include breakpoint(md)` / `breakpoint-down` mixins; no custom media queries.
- Reading views cap content at ~8–10 columns on `lg+`.

### 4.6 Motion

Productive curves by default. Durations: `$duration-fast-01` (70ms) · `fast-02` (110) · `moderate-01` (150) · `moderate-02` (240) · `slow-01` (400) · `slow-02` (700).

- Micro-interactions ≤ `moderate-01`. Panels / modals `moderate-02`.
- Respect `prefers-reduced-motion` — disable non-essential motion.

### 4.7 Icons & pictograms

- `@carbon/icons-react` only, sizes 16/20/24/32. Icon-only buttons must have `iconDescription`/`aria-label` and a tooltip.
- Pictograms (`@carbon/pictograms-react`) only in empty states and onboarding.

---

## 5. Component map (Carbon → Proptyop usage)

| Proptyop need | Carbon component(s) |
|---|---|
| App frame, global nav, user menu | `Header`, `SideNav`, `HeaderGlobalAction`, `HeaderPanel` (UI Shell) |
| Library list / request queue | `DataTable` (+ toolbar, batch actions, sorting, pagination, expandable rows) |
| Library card view | `Tile`, `ClickableTile`, `SelectableTile` |
| Search | `Search` (expandable in header, persistent on library page) |
| Filters | `FilterableMultiSelect`, `Checkbox` groups, `DatePicker`, `Tag` (dismissible) |
| Request form (multi-step) | `ProgressIndicator` + `Form`, `TextInput`, `TextArea`, `Select`, `FileUploader` |
| Interview scheduling | `DatePicker`, `TimePicker`, `RadioButtonGroup`, `Modal` |
| Status | `Tag`, `InlineNotification`, `ActionableNotification`, `ToastNotification` |
| Detail view (report / interview) | `Tabs`, `Accordion`, `StructuredList`, `CodeSnippet` (for citations/IDs) |
| Side detail without losing context | Side panel pattern (`@carbon/ibm-products` `SidePanel`) or `Modal` passive |
| Loading | `SkeletonText`, `DataTableSkeleton`, `SkeletonPlaceholder`, `InlineLoading` |
| Empty states | `@carbon/ibm-products` empty-state components or Tile + pictogram |
| Charts / analytics | `@carbon/charts-react` |
| AI content markers | `AILabel` (+ `AILabelContent`, `AILabelActions`) |

`@carbon/ibm-products` (Carbon for IBM Products) adds higher-level patterns (side panel, tearsheet, empty states, page header, create flows). Use it where it fits; it's built on the same tokens.

---

## 6. Proptyop product components (`src/shared/ui`)

Allowed when a pattern repeats ≥ 3 times. Each wraps Carbon, has a story, and an a11y test.

| Component | Purpose |
|---|---|
| `PageHeader` | Breadcrumb + title + primary/secondary actions + tabs |
| `AsyncBoundary` | Renders skeleton / empty / error / content from a query |
| `EmptyState` | Pictogram + title + 1-line help + primary action |
| `StatusTag` | Request/interview status → Carbon `Tag` type + icon + label |
| `ResearchCard` | Library item preview tile (title, author, type, date, tags) |
| `PersonChip` | Researcher/client avatar + name + role |
| `CitationLink` | Inline citation pointing to a source doc + passage |
| `AIResponse` | Streaming AI answer with `AILabel`, citations, feedback, regenerate |

---

## 7. Patterns (Carbon guidance we follow)

- **Buttons:** max one `primary` per view region. Order: primary on the right in modals / footers. Danger actions use `kind="danger"` + confirmation.
- **Forms:** labels above fields, helper text below, inline validation on blur, error summary at top on submit. Never placeholder-as-label.
- **Notifications:** inline for contextual, toast for async completion (auto-dismiss only for success/info), actionable for things needing a decision.
- **Data tables:** default density `md`; offer `sm`/`lg` toggle on large tables. Sticky header. Persist sort/filter/page in URL.
- **Modals:** for short, focused tasks only. Long creation flows → full page or Tearsheet.
- **Overflow menus:** max ~5–7 items; destructive at bottom, separated.

---

## 8. Accessibility checklist (per component/screen)

- [ ] Keyboard: Tab order logical, all actions reachable, `Esc` closes overlays, focus returns to trigger.
- [ ] Visible focus via `$focus` — never `outline: none`.
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI (Carbon tokens satisfy this — don't override).
- [ ] Every input labelled; errors announced (`aria-live` via Carbon components).
- [ ] Landmarks: `header`, `nav`, `main`, one `h1`.
- [ ] Target size ≥ 24×24 px (WCAG 2.2).
- [ ] Works at 200% zoom and 320px width.
- [ ] axe passes in unit + E2E tests.

---

## 9. Governance

- Need a new token or shared component? Open an ADR (`docs/adr`) with: problem, Carbon alternatives considered, screenshots.
- When upgrading Carbon, refresh the pinned `carbon` skill in the **same PR** so Claude Code's reference matches the installed version (steps in `CLAUDE.md`).
- Upgrade Carbon monthly; read release notes for deprecations (Carbon prefixes unstable APIs with `unstable_` / `preview` — avoid in production paths unless an ADR says so).
