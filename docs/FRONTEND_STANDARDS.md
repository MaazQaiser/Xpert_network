# Front-End Standards — Proptyop

How we write, test, review and ship code.

---

## 1. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`. (`exactOptionalPropertyTypes` is off — conflicts with CSS-module typings and Carbon props; see ADR 0008.)
- No `any`. Use `unknown` + narrowing. No non-null `!` except in tests.
- Prefer `type` for props/unions, `interface` only when extending.
- Derive types from Zod: `type Request = z.infer<typeof requestSchema>`.
- Discriminated unions for state (`{ status: 'idle' } | { status: 'error'; error: ApiError } …`).

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase file + folder | `RequestTable/RequestTable.tsx` |
| Hooks | `useX` camelCase | `useCreateRequest.ts` |
| Schemas | `x.schema.ts`, export `xSchema` | `request.schema.ts` |
| SCSS modules | same name as component | `RequestTable.module.scss` |
| Routes | kebab-case | `/requests/[requestId]` |
| Booleans | `is/has/can/should` | `isLoading`, `canPublish` |
| Event props | `onX`; handlers `handleX` | `onSubmit`, `handleSubmit` |
| Constants | `SCREAMING_SNAKE` | `MAX_UPLOAD_MB` |

Named exports only (except Next.js special files that require default).

## 3. Components

- One component per file; ≤ ~200 lines, else split.
- Props typed explicitly; spread `...rest` onto the root Carbon element when wrapping.
- Server Component by default; `'use client'` only at the smallest interactive leaf.
- No data fetching inside presentational components — pass data via props or use a feature hook in a container.
- Compose Carbon; do not override internals with `:global(.cds--…)` selectors. If unavoidable, document why in a comment + ADR.
- Every shared component has: story, unit test, axe test.

## 4. Styling

- `.module.scss` per component. Import tokens: `@use '@carbon/react/scss/spacing' as *; @use '@carbon/react/scss/theme' as *; @use '@carbon/react/scss/type' as *;`
- No hex, rgb, raw px for spacing/type, or `!important` (Stylelint enforces).
- Layout with Carbon `Grid`/`Column` or CSS grid/flex using spacing tokens.
- Mobile-first with Carbon `breakpoint` mixins.

## 5. Forms

- React Hook Form + `zodResolver`. Carbon inputs via a small `Controller` wrapper in `shared/ui/form`.
- Server re-validates; map server field errors back with `setError`.
- Disable submit only while submitting (not for invalid state — show errors instead).

## 6. Data fetching

- All requests go through `shared/api` client (auth, base URL, error mapping, retries).
- Query keys from feature `keys.ts` factories. No string literals inline.
- `staleTime` set deliberately per query; document non-defaults.
- Mutations: optimistic update only when rollback is trivial; always invalidate related keys.
- Cancel in-flight requests on unmount (TanStack does this; pass `signal` to fetch).

## 7. Accessibility

WCAG 2.2 AA (see `DESIGN_SYSTEM.md §8`). Additionally:

- `eslint-plugin-jsx-a11y` on; no disabled rules without a comment.
- `jest-axe`/`vitest-axe` in component tests; `@axe-core/playwright` in E2E.
- Manage focus after route changes and modal close.

## 8. Performance budgets

| Metric | Budget |
|---|---|
| LCP | < 2.5s (p75) |
| INP | < 200ms |
| CLS | < 0.1 |
| First-load JS per route | < 200 KB gzipped |

- Import Carbon components by name from `@carbon/react` (tree-shaken); icons individually.
- `next/dynamic` for heavy client-only pieces (charts, rich editor, transcript player).
- `next/image` for images, `next/font` for Plex.
- Virtualise long lists/tables (> 200 rows).
- Run `@next/bundle-analyzer` in CI on PRs touching dependencies.

## 9. Security

> Prototype: no real secrets or user data. Keep the rules below anyway so the code is ready for the real build — especially sanitising AI/markdown output.

- Never use `dangerouslySetInnerHTML` except through the sanitised Markdown renderer.
- Secrets only on the server; only `NEXT_PUBLIC_*` reach the client — review every one.
- CSP headers, `X-Frame-Options`, `Referrer-Policy` in `next.config.ts`.
- Validate file uploads (type + size) client-side and server-side.
- No PII or research content in logs or analytics events.

## 10. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | Pure logic in `model/`, hooks, formatters |
| Component | Vitest + Testing Library + MSW | Behaviour from the user's view (roles, labels), all 4 async states |
| E2E | Playwright | One happy-path test per flow (F0–F17), named by flow ID; critical ★ flows also cover key edge states via toolbar toggles |
| A11y | axe (component + E2E) | Every shared component and every page |
| Visual (later) | Playwright screenshots / Chromatic | Shared UI + key pages, white + g100 |

- Query by role/label, never by class or test-id unless unavoidable.
- Coverage target: 80% lines in `features/*/model` and `shared/`; don't chase coverage on UI glue.

## 11. Git & PRs

- Trunk-based, short-lived branches: `feat/requests-create-form`, `fix/library-search-empty`.
- Conventional Commits: `feat(requests): add brief review step`.
- PR ≤ ~400 changed lines. Template includes: what/why, screenshots (light + dark), UX checklist, AI checklist (if relevant), test notes.
- CI must pass: typecheck, lint, stylelint, unit, build, E2E smoke, bundle-size check.

## 12. Tooling config (baseline)

- **ESLint (flat):** `next/core-web-vitals`, `@typescript-eslint/strict`, `jsx-a11y`, `import`, `boundaries`, `react-hooks`.
- **Prettier:** default + `printWidth: 100`, `singleQuote: true`.
- **Stylelint:** `stylelint-config-standard-scss` + `stylelint-plugin-carbon-tokens` (enforce tokens).
- **Husky + lint-staged:** eslint/prettier/stylelint on staged files; commitlint on commit-msg.
- **Storybook:** for `shared/ui`, `shared/ai`, with Carbon theme switcher.

## 13. Definition of Done (per story)

- [ ] Meets acceptance criteria
- [ ] Loading / empty / error / success states
- [ ] Keyboard + screen reader checked; axe clean
- [ ] Light + dark theme checked; 320px and desktop
- [ ] Tests added/updated and passing
- [ ] No new lint/type warnings; bundle budget respected
- [ ] Docs/ADR updated if architecture or patterns changed

## 14. Kick-off sequence (Sprint 0)

1. `pnpm create next-app` (TS, App Router, ESLint, `src/`), no Tailwind.
2. Commit the pinned `carbon` skill to `.claude/skills/carbon` and configure the Carbon MCP in `.mcp.json`.
3. Add Carbon packages, `globals.scss`, Plex via `next/font`, `ThemeProvider` (follow the skill's `references/guides/sass.md` for Next.js Sass load paths).
4. Build UI Shell layouts for `(client)`, `(expert)` and `(admin)` (Header, SideNav, theme toggle) with role guards.
5. Set up tooling: ESLint boundaries, Prettier, Stylelint, Husky, Commitlint, Vitest, Playwright, MSW, Storybook.
6. Mock layer: `shared/api` client + QueryProvider + MSW + `src/mocks` (fixtures, store, scenarios) + **prototype toolbar** (role/persona switch, scenario controls, state toggles, reset).
7. `shared/ui`: `PageHeader`, `AsyncBoundary`, `EmptyState`, `StatusTag`.
8. `shared/ai`: `AIResponse`, `CitationLink`, `useAIStream` over the scripted mock AI engine.
9. CI pipeline + preview deployments.
10. Seed ADRs 0001–0005.
11. Then build flow by flow in the order of `PRODUCT_PLAN.md` §11, each flow meeting the flow Definition of Done (§12).
