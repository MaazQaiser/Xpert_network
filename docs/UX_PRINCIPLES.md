# UX Principles — NN/g heuristics applied to Proptyop

Grounded in Nielsen Norman Group research (10 Usability Heuristics, forms, search, empty states, error messages, progressive disclosure). Each heuristic below has **concrete Proptyop rules** Claude Code should apply.

---

## 1. Visibility of system status

- Every async action gives feedback within **100ms** (button `InlineLoading`), skeletons for anything > 300ms, progress for anything > 2s.
- Research requests and interviews always show a **status + "what happens next"** line (e.g. *"Matched to 3 researchers — expect proposals within 24h"*).
- AI generation streams tokens and shows the current step (*"Searching library… Reading 4 sources… Writing answer"*).
- Optimistic updates for low-risk actions (save to collection, tag); roll back with a toast on failure.

## 2. Match between system and the real world

- Use the user's vocabulary: *Goal, Brief, Needs summary, Library, Report, Custom request, Quote, Credits, Open call, Interview, Expert, Workspace, Folder, Label* — define a glossary in `/docs/glossary.md` and use it in copy, routes and code.
- Dates relative when recent (*"2h ago"*), absolute on hover and in exports. Always show the user's time zone for interviews.

## 3. User control and freedom

- **Undo over confirm** for reversible actions (archive, remove from collection) — toast with *Undo*.
- Confirmation modal only for destructive/irreversible actions (cancel a paid request, delete a report).
- Multi-step flows (new request, scheduling) autosave drafts and allow *Back* without data loss.
- Every AI action is reversible: *Discard*, *Edit*, *Regenerate*.

## 4. Consistency and standards

- Follow Carbon patterns first, platform conventions second, our own last.
- Same object = same component everywhere (`ResearchCard`, `StatusTag`, `PersonChip`).
- Primary action position and label verbs are consistent: *Create request*, *Schedule interview*, *Publish report*.

## 5. Error prevention

- Constrain inputs (date pickers, selects, input masks) instead of validating free text.
- Inline validation on blur; never on every keystroke for unfinished input.
- Warn on leaving a page with unsaved changes.
- Before submitting a request, show a **review step** summarising scope, budget, deadline.

## 6. Recognition rather than recall

- Show recent searches, recent items, and saved filters.
- Filters appear as dismissible `Tag`s above results.
- Within an interview transcript, keep speaker names and timestamps visible; sticky context header on scroll.

## 7. Flexibility and efficiency of use

- Keyboard shortcuts: `/` focus search, `g l` go to library, `g r` requests, `?` shortcut help, `⌘/Ctrl+K` command palette.
- Bulk actions in data tables. Saved views for researchers' queues.
- Power features hidden behind progressive disclosure, never removed.

## 8. Aesthetic and minimalist design

- One primary goal per screen. Remove anything that doesn't serve it.
- Long reports: comfortable reading width (~70ch), strong heading hierarchy, a sticky table of contents.
- Metadata is secondary — smaller type, `$text-secondary`.

## 9. Help users recognise, diagnose, and recover from errors

Error message formula (NN/g): **what happened + why (if known) + how to fix**, in plain language, near the problem.

| Bad | Good |
|---|---|
| "Error 422" | "The deadline must be at least 3 days away. Pick a later date." |
| "Something went wrong" | "We couldn't load interviews. Check your connection and try again." [Retry] |

- Never blame the user. Never show stack traces. Preserve user input after an error.

## 10. Help and documentation

- Contextual help: `Toggletip` next to complex fields, not a separate help page.
- Empty states teach: what this area is, why it's empty, the one action to start.
- First-run onboarding: max 3 steps, skippable.

---

## Domain-specific UX rules

### Search & library (NN/g search guidance)

- Search box is prominent, wide enough for ~27+ characters, and persistent on library pages.
- Support typo tolerance, synonyms and scoped search (All / Reports / Interviews / Experts).
- Results show *why* they matched (highlighted snippet), type, date, author.
- "No results" offers spelling suggestions, broader scope, and *Ask AI* / *Request research* as next actions — never a dead end.
- Faceted filters with counts; facets that would yield 0 are disabled, not hidden.

### Forms (research request, profile, interview setup)

- Single column. Group related fields with headings.
- Mark **optional** fields, not required ones (when most are required).
- Ask only what's needed now; defer the rest (progressive profiling).
- Field width hints expected length.
- Long forms → `ProgressIndicator` with ≤ 5 steps and a review step.

### Tables (request queue, interviews, library admin)

- Left-align text, right-align numbers, consistent date format.
- Row click opens detail in a side panel to preserve context; full page for deep work.
- Persist sort/filter/pagination in the URL so views are shareable.

### Empty, loading, error — required for every view

| State | Must include |
|---|---|
| Loading | Skeleton matching final layout (no spinners for full pages) |
| Empty (first use) | Pictogram, purpose, single primary CTA |
| Empty (filtered) | "No matches for X" + *Clear filters* |
| Error | Plain message + *Retry* + preserve state |
| Partial | Show what loaded; inline error for the failed part |

### Writing / microcopy

- Sentence case everywhere (Carbon standard).
- Front-load key words; buttons are verbs + noun (*Save draft*, not *OK*).
- Keep labels ≤ 3 words; helper text ≤ 1 sentence.

---

## UX review checklist (paste into PR description for UI changes)

- [ ] Which heuristic(s) does this screen most risk violating? Addressed?
- [ ] Loading / empty / error / partial states implemented
- [ ] Primary action clear; only one primary button per region
- [ ] Copy uses glossary terms, sentence case, actionable errors
- [ ] Keyboard-only walkthrough done
- [ ] Mobile (320px) and 200% zoom checked
