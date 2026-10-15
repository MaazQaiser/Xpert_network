# Front-End Architecture — Proptyop

Next.js App Router + TypeScript, organised by **feature** (feature-sliced, simplified). Goal: any feature can be understood, tested and changed in one folder.

---

## 1. Repository layout

```
proptyop-web/
├─ CLAUDE.md
├─ .claude/
│  └─ skills/
│     └─ carbon/        # pinned Carbon reference skill (committed, not symlinked)
├─ docs/
│  ├─ DESIGN_SYSTEM.md  UX_PRINCIPLES.md  AI_NATIVE.md
│  ├─ ARCHITECTURE.md   FRONTEND_STANDARDS.md
│  ├─ adr/              # architecture decision records (0001-*.md)
│  ├─ PRODUCT_PLAN.md   # prototype plan: flows, screens, mocks
│  ├─ flows/            # one spec per flow (F2-goal-chat.md …)
│  └─ stories/          # user stories per flow
├─ public/
├─ src/
│  ├─ app/                      # ROUTING ONLY — thin pages/layouts
│  │  ├─ (marketing)/           # public pages
│  │  ├─ (auth)/login/ …
│  │  ├─ (client)/              # client shell (Header + SideNav)
│  │  │  ├─ home/  ask/  ask/[briefId]/
│  │  │  ├─ library/  library/[itemId]/
│  │  │  ├─ requests/  workspace/  wallet/  settings/
│  │  ├─ (expert)/expert/       # expert shell
│  │  │  ├─ home/  calls/  calls/[callId]/
│  │  │  ├─ interviews/[id]/  earnings/  profile/
│  │  ├─ (admin)/admin/         # super admin shell, separate auth realm
│  │  │  └─ briefs/ quotes/ calls/ experts/ interviews/ reports/ library/ finance/ users/ audit/
│  │  ├─ api/                   # route handlers (BFF, AI streaming)
│  │  ├─ layout.tsx  error.tsx  not-found.tsx  loading.tsx
│  │  └─ globals.scss → imports src/styles
│  ├─ features/                 # BUSINESS FEATURES
│  │  ├─ auth/  onboarding/  profile/
│  │  ├─ goal-chat/  library/  custom-requests/  workspace/  wallet/
│  │  ├─ open-calls/  interview-room/  earnings/
│  │  ├─ admin-vetting/  admin-quotes/  admin-calls/  admin-qa/  admin-reports/  admin-finance/
│  │  └─ notifications/
│  ├─ shared/                   # REUSABLE, DOMAIN-AGNOSTIC
│  │  ├─ ui/                    # Carbon wrappers & product components
│  │  ├─ ai/                    # AIResponse, CitationLink, useAIStream
│  │  ├─ api/                   # http client, generated types, query client
│  │  ├─ hooks/                 # useDebounce, useMediaQuery…
│  │  ├─ lib/                   # formatters, dates, invariant, logger
│  │  ├─ config/                # env (zod-validated), feature flags, routes
│  │  └─ types/
│  ├─ providers/                # ThemeProvider, QueryProvider, AuthProvider
│  ├─ mocks/                    # PROTOTYPE BACKEND: fixtures, store, MSW handlers, scenarios, scripted AI
│  ├─ styles/                   # _tokens.scss, _mixins.scss, globals.scss
│  └─ test/                     # test utils, MSW handlers, fixtures
├─ e2e/                         # Playwright specs
├─ .mcp.json  .env.example  next.config.ts  tsconfig.json  …
```

### Feature folder anatomy

```
src/features/custom-requests/
├─ index.ts              # PUBLIC API — the only import path for other code
├─ api/                  # query keys, queries, mutations (TanStack Query)
│  ├─ keys.ts
│  ├─ useRequests.ts
│  └─ useCreateRequest.ts
├─ components/           # feature UI (client or server)
│  ├─ RequestTable/
│  │  ├─ RequestTable.tsx
│  │  ├─ RequestTable.module.scss
│  │  ├─ RequestTable.test.tsx
│  │  └─ RequestTable.stories.tsx
│  └─ RequestForm/…
├─ model/                # zod schemas, types, pure domain logic
│  ├─ request.schema.ts
│  └─ status.ts
├─ hooks/                # feature-specific hooks
├─ server/               # server-only fetchers / actions ('server-only')
└─ ai/                   # optional: feature's AI surfaces
```

---

## 2. Dependency rules (enforced by ESLint `boundaries` / `import/no-restricted-paths`)

```
app  →  features  →  shared
              ↘ providers
```

- `app/` may import from `features/*` (via `index.ts`) and `shared/`.
- `features/A` **must not** import `features/B` internals. If A needs B, either use B's public `index.ts` or lift the shared part into `shared/`.
- `shared/` **never** imports from `features/` or `app/`.
- Server-only modules import `'server-only'`; client modules never import them.

Path aliases (`tsconfig.json`):

```json
"paths": {
  "@/app/*": ["src/app/*"],
  "@/features/*": ["src/features/*"],
  "@/shared/*": ["src/shared/*"],
  "@/providers/*": ["src/providers/*"],
  "@/styles/*": ["src/styles/*"],
  "@/test/*": ["src/test/*"]
}
```

---

## 3. Rendering strategy

| Content | Strategy |
|---|---|
| Marketing pages | Static (SSG) |
| App shell / layouts | Server Components |
| Library list, detail | Client fetch via TanStack Query (MSW runs in the browser). Later: server fetch for first paint + hydrate |
| Highly interactive (forms, tables, AI chat) | Client Components at the leaf |
| AI responses | Client `useAIStream` over the scripted mock engine (later: streaming route handler) |

- Use `loading.tsx` with Carbon skeletons and `error.tsx` per route segment.
- Use `Suspense` boundaries around independent sections so slow data doesn't block the page.

---

## 4. Data layer — prototype mode (no backend)

This repo is a **front-end design prototype** (see `PRODUCT_PLAN.md` §8). All data is mocked, but behind the same seams a real backend would use, so swapping to a real API later touches only `shared/api` and `src/mocks`.

```
Component → feature hook (TanStack Query) → shared/api client (fetch) → MSW handler → mock store (fixtures + localStorage)
```

- **`src/mocks/`**
  - `fixtures/`: typed, realistic seed data per persona (companies, regions, reports, briefs, calls, experts, interviews).
  - `store/`: in-memory store persisted to `localStorage`; `resetDemo()`.
  - `handlers/`: MSW handlers per feature (`library.handlers.ts`…), with configurable latency and error injection.
  - `scenarios/`: scenario engine (advance request status, quote ready, interview flagged, payout paid).
  - `ai/`: scripted conversation engines for the goal chat, report Q&A and the interviewer (branching scripts + simulated streaming); voice via browser TTS / Web Speech API.
- **Server state:** TanStack Query. Query keys are factories per feature (`requestKeys.list(filters)`). Mutations invalidate precise keys.
- **Validation:** Zod schemas in `model/` validate mock responses too, so fixtures can't drift from types.
- **Errors:** a single `ApiError` type (status, code, userMessage) mapped to UX copy in one place. The prototype toolbar can force errors.
- **Prototype toolbar:** `src/features/prototype-toolbar/`, only rendered when `NEXT_PUBLIC_PROTOTYPE=true`. Holds the role/persona switcher, scenario controls, state toggles (slow, error, empty, low credits, mic denied) and reset.

## 5. State management order of preference

1. Server state → TanStack Query
2. URL state (filters, sort, page, tabs) → `searchParams` (use `nuqs` or a small helper)
3. Local component state → `useState` / `useReducer`
4. Cross-tree UI state (theme, command palette) → React context
5. Truly global client state → Zustand store in the owning feature (rare; needs justification)

## 6. Auth & authorization

- **Prototype:** fake auth. Login forms are real UI; submitting sets a mock session (role + persona) in a cookie/localStorage. The toolbar can switch role/persona instantly.
- Route groups `(client)`, `(expert)`, `(admin)` each have a client-side role guard (`<RequireRole role="expert">`) that redirects to the right login. Keep this guard as the single seam where real auth plugs in later.
- UI permissions via a `<Can permission="...">` helper.

## 7. Configuration

- `src/shared/config/env.ts` parses env with Zod. Prototype flags: `NEXT_PUBLIC_PROTOTYPE`, `NEXT_PUBLIC_MOCK_LATENCY_MS`.
- Feature flags in `src/shared/config/flags.ts`, used for every AI surface and for voice mode.

## 8. Observability

- Prototype: console logger in `shared/lib/logger`; optional product analytics events per flow step (to measure usability test sessions). Real error tracking comes with the real build.

## 9. Feature folders (mapped to flows)

Source of truth: `PRODUCT_PLAN.md` §4 (flows) and §9 (mock data shapes).

| Feature folder | Flows | Core types |
|---|---|---|
| `auth` | F0, F11 | User, Session, Role (client / expert / admin) |
| `onboarding` | F1, F7 | ClientProfile, ExpertProfile, ComplianceAttestation |
| `profile` | F17 | Profile, Preferences |
| `goal-chat` | F2 | ResearchBrief, StepStatus, CoverageItem |
| `library` | F3 | LibraryItem, Category |
| `custom-requests` | F4 | CustomRequest, Quote |
| `workspace` | F5 | Folder, Label, WorkspaceItem |
| `wallet` | F6 | Wallet, Transaction, CreditPack |
| `open-calls` | F8 | OpenCall, Application |
| `interview-room` | F9 | Interview, Section, TranscriptTurn |
| `earnings` | F10 | Earning, Payout |
| `admin-*` | F12–F16 | `admin-vetting`, `admin-quotes`, `admin-calls`, `admin-qa`, `admin-reports` |
| `notifications` | F17 | Notification |
| `prototype-toolbar` | — | Persona, Scenario, StateToggles |

Route groups in `src/app`: `(marketing)`, `(auth)`, `(client)`, `(expert)`, `(admin)`. Each has its own layout/shell and a client-side role guard (`RequireRole`, via `features/app-shell` `RoleShell`); Next 16 renames `middleware.ts` to `proxy.ts` if a server-side guard is added later. Admin uses a separate auth realm (`/admin/login`; console under `(admin)/admin/(console)`).

## 10. ADRs

Record decisions in `docs/adr/NNNN-kebab-title.md`: Context → Decision → Consequences → Alternatives. Seed ADRs:

- 0001 Use Next.js App Router
- 0002 Use Carbon v11 as design system
- 0003 Feature-sliced folder structure
- 0004 TanStack Query for server state
- 0005 Vendor the `carbon` reference skill into `.claude/skills` (pinned) + Carbon MCP for live lookups
- 0006 Front-end prototype: MSW + fixtures + scripted AI behind `shared/api`; real backend swapped in later
- 0007 Serve IBM Plex from /public via Carbon's font-face
- 0008 `exactOptionalPropertyTypes` off
- 0009 Proptyop look: Notion-like neutral themes, burnt-orange accent, Inter, floating panels
