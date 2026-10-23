# AI-Native Design — Xpert Network

AI is not a chatbot bolted on the side. In Xpert Network, AI is **woven into the research workflow**: asking the library, scoping requests, matching experts, and turning interviews into insight. This doc defines how AI shows up in the UI, built on **Carbon for AI** guidelines and NN/g research on generative-AI UX.

---

## 1. Principles

1. **Augment, don't replace.** AI drafts, summarises and suggests; humans (clients, researchers) decide and publish.
2. **Transparent.** Every AI-generated or AI-modified element is visibly marked with the assistant mascot (`AIExplainLabel`); its accessible name says it is AI generated (§3).
3. **Grounded.** Answers about the library cite sources. No citation → say so explicitly.
4. **Reversible.** Every AI action can be edited, regenerated, or discarded. Nothing AI does is silently committed.
5. **In context.** AI appears where the work happens (search bar, request form, transcript view) — not only in a separate chat page.
6. **Honest about uncertainty.** Show confidence/coverage signals; prefer "I couldn't find this in the library" over a guess.
7. **Private by design.** Users know what data the AI uses; client-confidential material is never used across tenants.

---

## 2. Xpert Network AI surfaces (initial)

| Surface | User | What AI does | Human control |
|---|---|---|---|
| **Ask the Library** | Client | Q&A over reports + transcripts with inline citations | Open sources, follow-ups, save answer to collection |
| **Request Copilot** | Client | Turns a rough question into a structured research brief (scope, questions, audience, timeline) | Edit every field; accept/reject suggestions per field |
| **Expert Matching** | Client / Ops | Suggests researchers/experts with *why matched* reasons | Shortlist, dismiss, override |
| **Interview Assist** | Researcher | Generates interview guide; live/post transcript summary, key quotes, themes | Edit guide; verify quotes link to timestamps |
| **Report Drafting** | Researcher | Drafts sections from notes + transcripts | Section-level accept/edit; "AI-assisted" marker persists until human edits |
| **Smart Search** | All | Semantic search, query suggestions, auto-filters | Show applied filters as removable tags |

---

## 3. Carbon for AI — how we apply it

- **The mascot mark (`AIExplainLabel`)** on any component whose content was generated or altered by AI (Tile, DataTable cell/row, form field, Modal, text block). Since 2026-10-23, at the stakeholder's request and across the whole product, it is the animated assistant mascot with **no explainability popover** (Carbon `AILabel` is no longer used). Its accessible name is "AI generated: …". Where the AI's basis matters, say it in the visible copy next to the content instead (e.g. "Drafted from the client's email").
- **AI presence styling** — use Carbon's AI tokens/gradients/aura for AI-generated containers so users can distinguish them at a glance. Don't invent our own AI colours or sparkle icons.
- **Revert state** — once a human edits an AI-filled field, a *Revert to AI draft* button appears beside the mascot so they can return to AI output or keep their edit.
- Keep AI styling **subtle**; content must remain the hero.
- **Exception — admin Home briefing (2026-10-22).** The "Your briefing" panel on `/admin/home` carries no mark, at the stakeholder's request. It is still marked as the assistant's by the mascot and greeting above it; the assistant's chat answers on the same page keep their marks.

---

## 4. Interaction patterns

### 4.1 Prompting & input

- Provide **starter prompts** relevant to the context (on a report page: *"Summarise key findings"*, *"What contradicts this?"*).
- Support scoping chips: *All library / This collection / This report / Interviews only*.
- Show the active scope inside the input so users know what AI will read.

### 4.2 Streaming output

- Stream tokens; show step indicators for agentic work (*Searching → Reading N sources → Drafting*).
- **Stop** button always available while generating.
- Reserve layout space to avoid content jumping; auto-scroll only if the user is at the bottom.

### 4.3 Citations

- Inline numbered citations `[1]` → hover shows source title + passage; click opens the source scrolled to the passage (or transcript at timestamp).
- A **Sources** list under every answer, with type icons (report, interview, dataset).
- Quotes from interviews must be verbatim and link to the exact timestamp.

### 4.4 Feedback & correction

- Thumbs up/down + optional reason on every answer; *Report an issue* for factual errors.
- *Regenerate*, *Edit*, *Copy*, *Save to collection*, *Turn into request* actions.
- Follow-up suggestions (2–3 max) after an answer.

### 4.5 Failure & empty

| Situation | UI response |
|---|---|
| Nothing relevant in library | "I couldn't find this in the Xpert Network library." + *Request research on this* CTA |
| Low confidence | Warning-style inline notice + show sources so user can judge |
| Model/timeout error | Plain error + *Retry*; preserve the prompt |
| Policy refusal | Neutral explanation, no blame, suggest rephrasing |

### 4.6 Human-in-the-loop for actions

Anything with side effects (send a request, invite an expert, publish) is **proposed by AI, confirmed by a human** via a review UI showing exactly what will happen.

---

## 5. NN/g gen-AI UX guidance we follow

- Reduce **articulation barrier**: don't rely on users writing great prompts — offer templates, chips, and structured inputs.
- Use **progressive disclosure** for long answers (summary first, details expandable).
- Support **iteration**: editing a previous prompt, branching, comparing answers.
- Calibrate **trust**: show sources and limits so users neither over- nor under-trust AI.
- Avoid anthropomorphism that implies certainty or human judgment.

---

## 6. Front-end implementation rules

- AI features live in `src/features/ai-*` or as an `ai/` subfolder within a feature; shared primitives in `src/shared/ai/`:
  - `AIResponse` (stream + citations + actions), `AIPromptInput`, `CitationLink`, `SourceList`, `AIFeedback`, `useAIStream` hook.
- Streaming via Route Handlers / server actions returning a `ReadableStream` (SSE or Vercel AI SDK-style protocol). Abort with `AbortController` on unmount/Stop.
- AI response payloads are validated with Zod: `{ text, citations[], confidence?, steps[] }`.
- Never render model output as raw HTML. Render Markdown through a sanitising renderer with an allow-list.
- Log prompt/answer IDs (not content) for feedback correlation; respect tenant privacy settings.
- Feature-flag every AI surface so it can be disabled per tenant.

---

## 7. AI UX checklist

- [ ] Mascot mark (`AIExplainLabel`) present, with an accessible name
- [ ] Sources/citations shown or absence stated
- [ ] Stop / Regenerate / Edit / Discard available
- [ ] Feedback control present
- [ ] Side-effecting actions require human confirmation
- [ ] Loading steps, error and "no answer" states designed
- [ ] Keyboard + screen-reader friendly (streamed text announced politely via `aria-live="polite"`)
