# Proptyop — Front-End Prototype Plan

> Status: v0.2 · Owner: Maaz · Last updated: 2026-10-15
> **Scope: front end only.** This is a high-fidelity, clickable **design prototype** built in Next.js + Carbon. There is **no real backend**: data, AI and payments are mocked. The goal is to **get the flows and the user experience right**, so the real build later is a swap of the mock layer, not a redesign.
> Next: per-flow specs in `docs/flows/*` and user stories in `docs/stories/*`.

---

## 1. Goals of the prototype

1. **Validate the flows end to end** for all three roles: client, expert and super admin.
2. **Nail the hard UX moments:** the stepper goal chat, the needs summary, library vs. custom choice, the quote, the interview room, the workspace.
3. **Feel real.** Realistic content, believable AI behaviour, every state designed (loading, empty, error, success, edge cases).
4. **Be testable.** Run moderated usability tests with real investors, business owners and experts.
5. **Be production-shaped.** Real components, real routes, typed mock data behind a service layer, so the code carries into the real build.

### Out of scope (prototype)

Real auth, real database, real payments and payouts, real LLM/voice integration, real compliance enforcement, email delivery, performance at scale, security hardening. These are represented **in the UI** (screens, states, copy) but driven by mocks.

---

## 2. What Proptyop is (product context)

An **expert-backed research library**:

- **Clients** (investors, business expanders) describe a goal in a guided AI chat. Proptyop confirms their needs, then sells matching **library reports** for **credits** or **quotes custom research**. Clients save and organise everything in a **workspace**.
- **Experts** sign up, get approved, pick **open calls**, and give **voice or text interviews to an AI interviewer**. They get paid per accepted interview.
- **Super admins** use a **separate login** to approve experts, send quotes, publish calls, check interviews, publish reports and manage credits.

Where the insight comes from (shown in the UI as provenance): expert interviews → custom reports → anonymised into the library after a period of exclusivity to the client.

---

## 3. Personas (used for scenarios and test scripts)

| ID | Persona | Goal in the prototype |
|---|---|---|
| **P1** | **Ayesha, investment analyst** | Understand the sales trajectory and competitive position of a company before investing |
| **P1b** | **Bilal, franchise owner** | Plan a franchise in a new region: procurement, suppliers, lead times, costs |
| **P2** | **Sara, ex supply-chain manager (expert)** | Earn by giving interviews on topics she knows |
| **P3** | **Ops admin** | Keep the marketplace moving: approve, quote, publish, check |

---

## 4. Flow inventory

Each flow has an ID used in specs, stories, routes and E2E tests. ★ marks the critical flows; build and test them first.

| ID | Flow | Role | Priority |
|---|---|---|---|
| F0 | Landing → sign up / log in → role select | All | Must |
| F1 | Client onboarding | Client | Must |
| **F2 ★** | **Goal chat with stepper → needs summary → options** | Client | Must |
| **F3 ★** | **Buy a library report with credits → read it → ask questions of it** | Client | Must |
| **F4 ★** | **Request custom research → receive quote → accept → track → delivery** | Client | Must |
| F5 | Workspace: folders, labels, rename, pin, archive, search | Client | Must |
| F6 | Wallet: buy credits, low-balance, history | Client | Must |
| F7 | Expert onboarding: profile → compliance → pending approval | Expert | Must |
| F8 | Open calls: browse → detail → screening → apply | Expert | Must |
| **F9 ★** | **Interview room: voice or text, sectioned stepper, progress, review, submit** | Expert | Must |
| F10 | Expert earnings & payout request | Expert | Should |
| F11 | Admin login → dashboard | Admin | Must |
| F12 | Admin: approve experts | Admin | Should |
| **F13 ★** | **Admin: brief → AI-drafted quote → send** | Admin | Must |
| F14 | Admin: create and publish an open call from an accepted request | Admin | Should |
| F15 | Admin: interview check (transcript, flags, redact, accept/reject) | Admin | Should |
| F16 | Admin: report publish (to client, then to library) | Admin | Could |
| F17 | Profile, settings, notifications (all roles) | All | Must |

---

## 5. Critical flows — screen by screen

Notation: **Screen** → key elements · *states to design* · ⚑ UX risk to test.

### F2 ★ Goal chat with stepper (client)

Layout: a vertical Carbon `ProgressIndicator` on the left (sections + status) and the chat on the right. On wide screens, a **live brief panel** on the far right fills in as the chat progresses. A section progress bar sits at the top.

| Step | Section | AI asks / user does | Done when | UI details |
|---|---|---|---|---|
| 1 | **Goal** | "What decision are you trying to make?" | Goal type + one-line objective confirmed | Chips: *Invest in a company · Expand to a new region · Understand a market · Other* |
| 2 | **Subject** | Company / industry / region / time frame | At least one subject resolved | Company/region autocomplete chips; "Did you mean…" disambiguation |
| 3 | **Questions** | What they need to know | 3–10 prioritised questions | AI suggests questions as checkable cards; drag to reorder; add your own |
| 4 | **Constraints** | Deadline, budget (credits), depth | Deadline + budget range | Inline date picker + credit slider inside the chat |
| 5 | **Needs summary** | AI shows the **Research Brief** | Client clicks **Confirm needs** | Editable structured card: objective, subject, questions, constraints. Edits sync back to the steps |
| 6 | **Options** | Proptyop shows what it can do | Client picks an option | **Coverage map**: per question, *Covered / Partly / Not covered* by library items. Three option cards: ① Buy library reports (credits) ② Request custom research (quote) ③ Mix |
| 7 | **Checkout / Request** | Confirm purchase **or** submit for a quote | Done screen | Credit balance check; low balance → top-up inline. Request → "Quote within 24h" confirmation + where to find it |

Behaviour:

- Sections show *not started / in progress / complete / needs attention*. Click a completed step to jump back.
- AI won't advance until the step's done condition is met. A **Skip** option exists where it's safe.
- Autosaves as a **draft brief** (appears in the workspace). "Resume where you left off" on the home page.
- Starter chips at each step, e.g. for P1b: *"Top suppliers in region"*, *"Typical lead times"*.
- *States:* first-time empty chat, AI thinking/streaming, AI can't resolve the company, user types something off-topic, network error mid-stream, all questions covered (no custom needed), nothing covered (custom only), insufficient credits.
- ⚑ Does the stepper feel guiding or restrictive? Do users understand the coverage map? Is the needs summary trusted?

### F3 ★ Library purchase → read → ask (client)

1. **Library** (`/library`): search, category shelves (industry → sub-industry), filters as tags (region, company, date, price), card/table toggle.
2. **Report preview**: title, summary, table of contents, 1 sample chart, *expert count + profiles (anonymised: role, years, region)*, date, price in credits, provenance note.
3. **Buy**: confirm modal → credits deducted → toast → opens the report.
4. **Report viewer**: sticky table of contents, sections, charts, expert quotes with source tags, download as PDF (mocked), save to folder, add labels.
5. **Ask this report**: side panel AI Q&A with citations into report sections.

*States:* not owned / owned, insufficient credits, report updated since purchase, no search results → *"Ask about this"* (opens F2) / *"Request research"*.
⚑ Is the preview enough to justify the purchase? Is provenance (expert-backed) convincing?

### F4 ★ Custom request → quote → delivery (client)

1. **Request submitted** confirmation (from F2 step 7).
2. **Requests list** (`/requests`): status tags.
3. **Request detail**: horizontal status tracker: *Quote requested → Quote ready → Accepted → Recruiting experts → Interviews (n/m) → Analysis → Delivered*.
4. **Quote view**: scope (questions in/out), number of experts, timeline, credits, what's included, validity date. Actions: **Accept** (credits held, explained clearly) · **Ask a question** (message thread) · **Decline** (reason).
5. **In progress**: live-ish progress (mock timeline), expert profiles as they join (anonymised), estimated delivery.
6. **Delivered**: report opens in the viewer (same as F3), rate it, request a follow-up.

*States:* quote expired, quote revised, partial delivery (fewer experts) with credit refund notice, cancelled.
⚑ Do users understand "credits held vs. spent"? Is the timeline credible?

### F9 ★ Interview room (expert)

1. **Pre-flight**: topic, estimated time, fee, mode choice **Voice / Text**, mic check (voice), language, **compliance reminder + checkbox** ("I won't share confidential or non-public information").
2. **Room layout**:
   - Left: vertical stepper of interview sections (e.g. *Background → Market overview → Suppliers → Pricing → Risks → Wrap-up*) with status per section.
   - Top: overall progress bar, elapsed time, Pause.
   - Main: **Voice**: AI speaking indicator, live transcript, push-to-talk / auto VAD indicator. **Text**: chat.
   - Controls: Pause/Resume, switch Voice ↔ Text, Skip question (with reason), **"I can't answer — confidential"**, End early.
3. **Section completion**: the AI checks that the minimum answers are covered, asks follow-ups, then shows "Section complete ✓". Moves on.
4. **Compliance deflection moment** (scripted): the expert gives an exact internal figure → AI gently reminds them and asks for a range or estimate instead.
5. **Review**: AI summary per section → expert edits or confirms.
6. **Submitted**: "Under review — usually within 48h", fee shown as *pending*.

*States:* mic permission denied → offer text, connection lost → resume at the same section, paused for > 10 min, ended early (partial), expert ineligible (conflict).
⚑ Is voice comfortable with an AI? Does the section stepper reduce anxiety about length? Does the compliance moment feel respectful?

### F13 ★ Admin: brief → quote (super admin)

1. **Admin dashboard**: queues with counts: *Experts to approve · Briefs awaiting quote · Interviews to check · Payout requests*.
2. **Brief detail**: client's confirmed brief, coverage map, chat transcript (read-only).
3. **Quote builder**: **AI-drafted** quote (labelled with `AILabel`): experts needed, profile mix, ETA, credits (from pricing rules). Admin edits any field → preview as the client will see it → **Send**.
4. Sent → status updates in the client's F4 (via the prototype scenario engine).

⚑ Can an admin produce a quote in < 3 minutes? Is the AI draft trusted and easy to correct?

---

## 6. Supporting flows (summary)

| Flow | Key screens & states |
|---|---|
| **F0 Auth** | Landing, sign up (email / Google / LinkedIn — mocked), log in, forgot password, verify email notice, **role select** (Client / Expert). Admin has its own `/admin/login` with a different look (dark header). |
| **F1 Client onboarding** | 3 steps with `ProgressIndicator`: *About you → What you research (industries, regions) → First goal* (deep link into F2). Skippable. |
| **F5 Workspace** | Left tree of folders (2 levels) + label list; main list of items (briefs, reports, requests) with type icons. Create/rename/move/delete folder, create/assign labels (colour + name), rename item, pin, archive, bulk move. Search + filters. Empty states per folder. |
| **F6 Wallet** | Balance card, credit packs, mock checkout, transaction history (purchase / hold / spent / refund), low-balance banner across the app. |
| **F7 Expert onboarding** | Stepper: *Basics → Work history → Expertise & regions → Compliance & conflicts → Submit*. Then **Pending approval** status page with what happens next. Rejected and approved states. |
| **F8 Open calls** | Listing with match score ("Strong match"), filters (industry, region, fee, time), card → detail (brief, fee, time, deadline, mode) → screening questions → applied / auto-approved / not eligible (conflict). Evergreen calls badge. |
| **F10 Earnings** | Pending / approved / paid totals, per-interview list, request payout (mock), payout method setup. |
| **F12 Approve experts** | Queue table → profile drawer → AI fit score + red flags → Approve / Reject (reason) / Ask for info. |
| **F14 Create open call** | From an accepted request: AI drafts the call + interview guide (sections and questions) → edit → publish. |
| **F15 Interview check** | Transcript + audio player, flagged passages highlighted, redact, accept/reject, rating. |
| **F16 Report publish** | AI draft report from transcripts → edit sections → deliver to client → later "Publish to library" with price + category. |
| **F17 Profile & settings** | Profile, notification preferences, security (mocked), theme (light/dark), notification centre (Carbon `HeaderPanel`). |

---

## 7. Screen inventory

| Area | Screens |
|---|---|
| Public | Landing, How it works, For experts, Pricing, Log in, Sign up, Forgot password, Verify email, Role select |
| Client | Onboarding, Home, Ask (goal chat), Library, Category shelf, Report preview, Report viewer, Requests list, Request detail / quote, Workspace, Wallet, Settings |
| Expert | Onboarding, Pending approval, Home, Open calls, Call detail + apply, Interview pre-flight, Interview room, Interview review, Earnings, Profile |
| Admin | Login, Dashboard, Experts queue, Brief detail + quote builder, Requests, Open calls + call builder, Interview check, Reports, Library manager, Finance (credits view), Users |
| Shared | Notification panel, 404, error page, global search / command palette |

Routes follow the structure in `ARCHITECTURE.md` (route groups `(marketing)`, `(auth)`, `(client)`, `(expert)`, `(admin)`).

---

## 8. How the prototype fakes the backend

| Concern | Prototype approach |
|---|---|
| Data | Typed **fixtures** in `src/mocks/fixtures` (companies, regions, reports, briefs, calls, experts, interviews). Served through a **mock service layer** (`src/shared/api`), with MSW in the browser so components call "real" endpoints |
| Persistence | In-memory store + `localStorage` per browser, so a tester's folders, labels and purchases persist during a session. **Reset demo** button |
| Auth | Fake login; a **role switcher** in the prototype toolbar (Client / Expert / Admin) and persona picker (Ayesha / Bilal / Sara / Ops) |
| AI chat (F2, report Q&A) | **Scripted conversation engine:** per-persona scripts with branching on chip choices + keyword matching, and streamed output with realistic delays. Falls back to a polite "Let's continue with…" |
| AI interviewer (F9) | Scripted guide; **voice simulated** with browser speech synthesis (TTS) for the AI and the Web Speech API (or typed fallback) for the expert; transcript appears live |
| Payments | Mock checkout modal; wallet math in the client store |
| Time-based status (quotes, delivery) | **Scenario engine**: the prototype toolbar has "Advance request → next status", "Quote ready", "Interview flagged", "Payout paid" |
| Notifications | Triggered by the scenario engine; shown in the notification panel + toast |
| Errors / edge cases | Toolbar toggles: *Slow network*, *API error*, *Empty data*, *Low credits*, *Mic denied* — to demo and test every state |

The **prototype toolbar** is a small floating panel (only in prototype builds) that holds the role/persona switch, scenario controls, state toggles and reset.

---

## 9. Mock data shapes (front-end types)

Kept minimal; these become Zod schemas in each feature's `model/`.

```
User { id, role: 'client'|'expert'|'admin', name, avatar }
ResearchBrief { id, title, goalType, objective, subjects[], questions[{id,text,priority}],
                constraints{deadline, budgetCredits, depth}, status: 'draft'|'confirmed',
                stepStatus: Record<StepId, 'todo'|'active'|'done'|'attention'> }
CoverageItem { questionId, coverage: 'full'|'partial'|'none', libraryItemIds[] }
LibraryItem { id, title, summary, category, regions[], companies[], priceCredits,
              expertCount, experts[{role, years, region}], toc[], owned }
CustomRequest { id, briefId, status, quote?{credits, experts, etaDays, scope, validUntil},
                timeline[{status, at}] }
WorkspaceItem { id, type: 'brief'|'report'|'request', refId, name, folderId?, labelIds[],
                pinned, archived, updatedAt }
Folder { id, name, parentId? }   Label { id, name, color }
Wallet { balance, held, transactions[{type, amount, ref, at}] }
OpenCall { id, title, topic, regions[], fee, estMinutes, deadline, match, sections[] }
Interview { id, callId, mode: 'voice'|'text', sections[{id,title,status}], transcript[],
            summary?, status }
```

---

## 10. AI moments to prototype (per `AI_NATIVE.md`)

| Moment | Flow | Must show |
|---|---|---|
| Brief agent chat | F2 | Stepper, chips, streaming, editable summary, `AILabel` on the summary |
| Coverage map | F2 | Per-question coverage with "why" (matched report sections) |
| Report Q&A | F3 | Citations into sections, "not in this report" response + "Request research" CTA |
| AI interviewer | F9 | Section progress, follow-ups, compliance deflection, editable summary |
| Quote drafter | F13 | `AILabel`, editable fields, revert-to-AI |
| Expert fit score | F12 | Reasons, not just a number |
| Call/guide writer, report writer | F14, F16 | Draft → edit → publish with clear AI marking |

---

## 11. Build phases (front end)

| Phase | Deliverable | Flows |
|---|---|---|
| 0 | Sprint 0: repo, Carbon, shells for 3 roles, prototype toolbar, mock layer, fixtures | — |
| 1 | Auth + onboarding + settings (cookie-cutter) | F0, F1, F7, F17 |
| 2 | **Goal chat** with stepper, summary, coverage, options | **F2** |
| 3 | Library + report viewer + Q&A + wallet | **F3**, F6 |
| 4 | Custom requests + quotes + workspace | **F4**, F5 |
| 5 | Open calls + **interview room** (text, then voice) + earnings | F8, **F9**, F10 |
| 6 | Admin console | F11, F12, **F13**, F14, F15, F16 |
| 7 | Polish: all states, a11y audit, dark theme, responsive, usability test round 1 | All |

---

## 12. Definition of done — per flow

- [ ] Every screen in the flow is built with Carbon, both themes, 320px → desktop
- [ ] Happy path clickable end to end with realistic fixture content (no lorem ipsum)
- [ ] Loading, empty, error, and the flow's listed edge states reachable via the prototype toolbar
- [ ] Keyboard-only walkthrough passes; axe clean
- [ ] AI moments follow `AI_NATIVE.md` (label, cite, reversible)
- [ ] Copy reviewed (sentence case, glossary terms, actionable errors)
- [ ] One Playwright test walks the happy path
- [ ] Flow spec in `docs/flows/Fx-*.md` updated with screenshots

---

## 13. Usability testing plan

Run after phases 3, 5 and 7. 5 participants per persona type.

| Task | Persona | Success signal |
|---|---|---|
| "Find out how [Company] sales have trended and decide if Proptyop can help" | P1 | Completes F2 → chooses an option in < 8 min without help |
| "Plan sourcing for a café franchise in [Region]" | P1b | Understands the coverage map; requests a quote |
| "Accept the quote you received" | P1 / P1b | Can explain held vs. spent credits |
| "Save this report into a new folder and label it" | P1 | < 60s |
| "Find an interview you can do and complete it" | P2 | Completes F9 (text or voice); rates comfort ≥ 4/5 |
| "Send a quote for the waiting brief" | P3 | < 3 min |

Measures: task success, time on task, errors, SEQ (single ease question) per task, SUS at the end, qualitative notes on trust in AI.

---

## 14. Open UX questions

1. Are experts **anonymous** to clients (role + years + region) or named? (Affects report and request screens.)
2. Should the goal chat allow **free-form chat** after step 7, or end the session and start a new one?
3. Credit price display: credits only, or credits + currency equivalent?
4. Can clients **message** admins on a quote, or only accept/decline?
5. Voice interview: push-to-talk or always listening?
6. Admin as `/admin` in the same app (recommended for the prototype) vs. a separate subdomain later?
7. Launch content: which **industries and regions** should fixtures use? (Defaults: F&B franchising in the Gulf; consumer retail companies for investors.)
