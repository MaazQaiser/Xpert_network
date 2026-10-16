# F2 ★ Goal chat → needs summary → options

- Status: Built (prototype) · 2026-10-15
- Route: `/ask` (creates a draft brief) → `/ask/[briefId]`
- Feature: `src/features/goal-chat` · Mock: `src/mocks/ai/goalChat`, `src/mocks/handlers/briefs.handlers.ts`
- E2E: `e2e/F2-goal-chat.spec.ts`

## Layout

| Area                 | Breakpoint                                                 | What                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Progress bar         | all                                                        | Thin filling bar pinned directly under the app header                                                                                                                          |
| Page header          | all                                                        | Title (brief title once known), "n of 7 steps complete · now: <step> · Saved automatically · updated …", status tag                                                            |
| Chat                 | all                                                        | Assistant messages (AI label + timestamp + feedback), user bubbles, one interactive widget on the latest reply, sticky composer                                                |
| Research brief panel | `lg+` beside the chat; below `lg` in an accordion above it | The progress check: each step with its status icon (complete / in progress / needs attention / not started) and its answer so far; finished steps have **Edit** to reopen them |

## Steps

| #   | Step          | Widget                                                                                                                                                    | Done when                                                  |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Goal          | Goal-type chips → objective starter chips (or free text)                                                                                                  | Goal type + objective of ≥ 4 words                         |
| 2   | Subject       | "Did you mean…" candidates, keep-as-custom, autocomplete `ComboBox`, suggestion buttons, dismissible tags                                                 | ≥ 1 subject                                                |
| 3   | Questions     | AI-suggested questions as checkboxes (top 5 preselected), Move up/down, add your own                                                                      | 3–10 selected                                              |
| 4   | Constraints   | Date picker (≥ 3 days out), credit slider with currency, depth radios; **Skip for now**                                                                   | Deadline + budget (skip → _needs attention_)               |
| 5   | Needs summary | Research brief card with `AILabel`; Edit → Save (label switches to revert); **Confirm needs**                                                             | Confirmed                                                  |
| 6   | Options       | Coverage map (Covered / Partly / Not covered + reason + source) and 3 option tiles; inapplicable options disabled with a reason; one marked _Recommended_ | Option chosen                                              |
| 7   | Checkout      | Reports (owned ones excluded), total vs. balance, inline top-up when short; quote scope for custom/mix                                                    | Purchase and/or quote request → done panel with next steps |

Revisiting a gathering step (1–4) returns straight to the summary; any change after confirming re-opens confirmation.

## Coverage rules (mock)

A question's topic is matched to report sections. Grade by scope: company or region match → **Covered**; report covers a broader region (e.g. KSA for Riyadh) → **Partly**, except for nationwide topics (licensing, regulation, staffing) → **Covered**; different region → **Partly**; no section → **Not covered**.

## States and how to reach them (prototype toolbar)

| State                                                | How                                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| First-time empty chat                                | Open `/ask`                                        |
| Streaming + step labels ("Searching the library…")   | Any turn; _Slow network_ makes it visible          |
| Can't resolve a subject / did you mean               | Type "Qahwa" or "Jed"; type "Zanzibar" for unknown |
| Off-topic message                                    | Type "Tell me a joke"                              |
| Network error mid-stream (retry, answer differently) | _API error_ on, then answer                        |
| Brief failed to load                                 | _API error_ on, reload                             |
| All covered (custom not needed, mix disabled)        | Coverage → _All questions covered_                 |
| Nothing covered (custom only)                        | Coverage → _Nothing covered_, or _Empty data_      |
| Insufficient credits + inline top-up                 | _Low credits_ on                                   |
| Stop / regenerate                                    | Press **Stop** while a reply streams               |

## Decisions

- Experts are anonymous to clients (role, years, region) — open question #1.
- Prices show credits plus currency, e.g. "120 credits (≈ $600)"; 1 credit ≈ US$5 — open question #3.
- Question reordering uses Move up / Move down buttons (keyboard-accessible) instead of drag.
- The chat ends at the done panel; free-form chat after step 7 is not offered (open question #2, provisional).

## Open / next

- Screenshots for this spec (light + dark).
- Requests (F4) and Library (F3) pages that the done panel links to are placeholders.

## Entry from Home (2026-10-16)

Home has the same floating pill composer at the bottom centre, plus a **Start new research** card. Typing a goal there creates a brief and opens its chat with that text as the first message (answered as the goal step). The text is handed over in memory (`model/pendingPrompt.ts`), not in the URL.
