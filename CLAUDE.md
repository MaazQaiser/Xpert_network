# CLAUDE.md — Proptyop Front End

> Read this first. It is the contract for every change Claude Code makes in this repo.
> Details live in `/docs`. When a rule here conflicts with a doc, this file wins.

## What we're building

> **Mode: front-end design prototype.** No real backend. All data, auth, payments and AI are mocked behind `shared/api` + `src/mocks` (MSW, fixtures, scripted AI). The goal is **getting flows and UX right**. Never add backend services, databases or real third-party integrations; add a mock instead.

**Proptyop** is an expert-backed research library. Three roles:

- **Clients** (investors, business expanders) define a goal in a guided AI chat with a stepper. Proptyop confirms their needs, then sells matching **library reports** for credits or quotes **custom research**. Clients organise everything in a **workspace** of folders and labels.
- **Experts** sign up, get vetted, answer **open calls**, and give **voice or text interviews to our AI interviewer**. They get paid per accepted interview.
- **Super admins** use a separate login to vet experts, send quotes, publish calls, QA interviews, publish reports and manage credits and payouts.

Full plan: [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) — flows F0–F17, screens, mock strategy. Flow specs go in `/docs/flows/*`, user stories in `/docs/stories/*`.

## Stack (do not swap without an ADR)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, latest stable), React, TypeScript `strict` |
| Design system | Carbon v11 — `@carbon/react`, `@carbon/icons-react`, `@carbon/pictograms-react`, `@carbon/charts-react` |
| Styling | Sass (`.module.scss`) using Carbon tokens only. No Tailwind, no CSS-in-JS |
| Server state | TanStack Query |
| Client state | React state → URL search params → Zustand (only if truly global) |
| Forms | React Hook Form + Zod |
| Mock backend | MSW (browser) + typed fixtures + localStorage store + scenario engine + scripted AI (`src/mocks`) |
| Testing | Vitest + Testing Library, Playwright (+ axe) for E2E, MSW for mocks |
| Quality | ESLint (flat config), Prettier, Stylelint, Husky + lint-staged, Commitlint |
| Package manager | pnpm |

## Docs index — read the one that matches your task

| Doc | Read when… |
|---|---|
| [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) | Personas, flow inventory (F0–F17), screen-by-screen critical flows, how mocks work, build phases |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Building or styling any UI |
| [`docs/UX_PRINCIPLES.md`](docs/UX_PRINCIPLES.md) | Designing a flow, form, empty state, error, table, nav |
| [`docs/AI_NATIVE.md`](docs/AI_NATIVE.md) | Anything that shows, streams, or acts on AI output |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Adding a route, feature, module, API call, or folder |
| [`docs/FRONTEND_STANDARDS.md`](docs/FRONTEND_STANDARDS.md) | Writing code, tests, naming, PRs, performance |
| **`carbon` skill** (`.claude/skills/carbon`) | Exact Carbon API: component usage, props, Sass setup, themes, grid, tokens, icons, feature flags |

**How the two layers fit:** `/docs` says *what we want and why* (our rules). The `carbon` skill says *how Carbon works* (facts). If they ever disagree, our docs win on policy; the skill wins on API facts — then fix the doc.

## Non-negotiables

1. **Carbon first.** Use a Carbon component before building one. Never restyle Carbon internals with deep selectors; compose or wrap.
2. **Tokens only.** No hex colours, no raw `px` spacing, no custom font stacks. Use `$spacing-*`, colour tokens (`$text-primary`, `$layer-01`…), and type sets (`@include type-style('body-01')`).
3. **Accessible by default.** WCAG 2.2 AA. Every interactive element is keyboard-reachable, labelled, and has visible focus. Run axe in tests.
4. **Feature-sliced.** Code lives in `src/features/<feature>`. Features never import each other's internals — only their `index.ts` public API.
5. **Server Components by default.** Add `'use client'` only at the leaf that needs interactivity. Carbon interactive components are client components — wrap them.
6. **Every async view has 4 states:** loading (skeleton), empty, error (with recovery), success — each reachable from the prototype toolbar.
7. **AI output is always labelled, attributable, and reversible.** See `AI_NATIVE.md`.
8. **Types are the contract.** No `any`. Validate all external data with Zod at the boundary.
9. **Small PRs.** One concern per PR. Conventional Commits.
10. **Flow first.** Work is planned and named by flow ID (e.g. `feat(F2): coverage map`). A flow is done only when it meets `PRODUCT_PLAN.md` §12.
11. **Realistic content.** No lorem ipsum: use the persona fixtures so usability tests feel real.

## Workflow for Claude Code

1. Restate the task and list files you'll touch before editing.
2. Check `src/shared/ui` and Carbon for an existing component first. **Before using any Carbon component, open its page in the `carbon` skill** (`references/react/components/<Name>.md`, index at `references/CONTENTS.md`) — never write Carbon props or Sass from memory. For live prop tables, use the Carbon MCP or Storybook.
3. Write/adjust types and Zod schemas → API hook → UI → tests.
4. Run: `pnpm typecheck && pnpm lint && pnpm test` before declaring done.
5. If you make an architectural decision, add an ADR in `docs/adr/NNNN-title.md`.
6. If unsure about a UX decision, cite the relevant section of `UX_PRINCIPLES.md` in your reasoning.

## Commands

```bash
pnpm dev            # local dev
pnpm build          # production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint + stylelint
pnpm test           # vitest
pnpm test:e2e       # playwright (+ axe)
pnpm dev:demo       # dev with prototype toolbar + mocks on
```

## Carbon knowledge sources (in order)

1. **`carbon` skill** — committed at `.claude/skills/carbon/`, an offline copy of Carbon's own docs (from [iamursky/carbon-skill](https://github.com/iamursky/carbon-skill), MIT; references Apache-2.0). **Pinned** — see `.claude/skills/carbon/PINNED.md` for the commit. Only update it deliberately, in the same PR as a Carbon version bump.
2. **Carbon MCP server** — live lookups of component APIs and usage guidance. Configure in `.mcp.json` (carbondesignsystem.com → Developing → Carbon MCP).
3. **Storybook** (react.carbondesignsystem.com) — source of truth for exact props.
4. **carbondesignsystem.com** — design usage, do/don't, accessibility guidance.

Not covered by the skill: `@carbon/charts-react` and most of `@carbon/ibm-products` — use their own docs/Storybooks.

Updating the skill:

```bash
git clone --depth 1 https://github.com/iamursky/carbon-skill /tmp/carbon-skill
rm -rf .claude/skills/carbon && cp -r /tmp/carbon-skill/skills/carbon .claude/skills/carbon
# then update PINNED.md with: git -C /tmp/carbon-skill rev-parse HEAD
```
