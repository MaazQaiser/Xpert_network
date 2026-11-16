# ADR 0016 — Home's chat is Scio, an AI agent on the PoC backend

- **Status:** Accepted
- **Date:** 2026-11-16
- **Relates to:** ADR 0006 (the mock seam). The GetSales calls already pass through it to the backend.

## Context

The admin Home chat was answered by a scripted mock in the browser (`src/mocks/ai/admin/assistant.ts`, behind `/api/admin/assistant`). That kept flows easy to demo, but the assistant now has to do real work: read new client briefs, and later extract requirements, search for people, and draft and send outreach. That needs model calls and API keys, which can't live in the browser.

## Decision

- **Scio replaces the scripted assistant on Home.** Scio is a LangChain Deep Agents agent running OpenAI models on the FastAPI PoC backend (`backend/app/agents/scio`). It plans multi-step requests, can hand work to sub-agents, and gains tools, specialist agents and MCP servers over time. Home sends each question to `POST /api/scio/chat` and renders the answer as it streams.
- **Wire format.** Newline-delimited JSON in our existing AI protocol (`src/shared/ai/protocol.ts`): `step`, `token`, `error`, then `done` with a result in the Home reply shape (`scioReplySchema`: text, blocks, chips, plus the chat it belongs to). Existing blocks (`emails` cards) and chips render unchanged.
- **Routing.** `next.config.ts` rewrites `/api/scio/*` to the backend, like `/api/getsales/*`. The browser MSW worker has no handler for these paths, so they pass through. Tests serve scripted Scio streams from `src/mocks/node.ts`.
- **Saved chats.** Each chat has an id and an AI title. Recent chats are listed under Home in the side nav (`AdminConsoleShell` passes them to `RoleShell` as nav children). A chat opens at `/admin/home/chat/<id>`. Home renders in the `home` layout, so it stays mounted when a new chat gets its address after the first question.
- **LinkedIn lookup removed from Home.** The paste-a-LinkedIn-link lookup and its message card are gone. Outreach comes back later as a Scio capability.

## Consequences

- Home's chat needs the backend running (`python -m app.main`). Without it, a question ends in an error with Retry; the rest of Home still works on mocks.
- The scripted `/api/admin/assistant` handler stays in the mocks for now, unused by Home. Its richer demo flows (projects, booking) return only as Scio gains those capabilities.
- Answers follow AI_NATIVE: labelled with `AIExplainLabel`, streamed with step indicators and Stop, with what they're based on, and Retry on failure. Scio never sends anything; it only drafts.
