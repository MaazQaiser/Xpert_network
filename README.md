# Xpert Network — front-end prototype

Clickable, high-fidelity prototype of Xpert Network, an expert-backed research library. Next.js + Carbon, with all data, auth, payments and AI mocked in the browser (MSW). Start with [`CLAUDE.md`](CLAUDE.md) and [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md).

## Run it

```bash
pnpm install        # also copies IBM Plex fonts into public/fonts
pnpm dev:demo       # http://localhost:3000 with the prototype toolbar
```

Log in from **/login** with a demo account (Ayesha or Bilal for clients, Sara for experts) or **/admin/login** (Omar). The bug icon on the right edge opens the prototype controls: switch persona, toggle slow network / API errors / empty data / low credits, choose a coverage scenario, reset the demo.

## What's built

| Area                                                                                                                          | Status                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Sprint 0 core: shells for client / expert / admin, theme toggle, mock backend, prototype toolbar, shared UI and AI primitives | Done                                                                      |
| F0 landing, log in, role select (minimal)                                                                                     | Done                                                                      |
| **F2 ★ goal chat** → needs summary → coverage map → checkout                                                                  | Done — spec in [`docs/flows/F2-goal-chat.md`](docs/flows/F2-goal-chat.md) |
| Everything else                                                                                                               | Placeholder screens labelled with their flow and phase                    |

## Check

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e       # Playwright + axe; starts dev:demo if it isn't running
```
