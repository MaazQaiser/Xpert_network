# F7 Expert onboarding → pending approval

- Status: Built (prototype) · 2026-10-15
- Routes: `/expert/onboarding` → `/expert/pending` → `/expert/home` (approved)
- Feature: `src/features/onboarding` (`ExpertOnboardingFlow`, `ExpertPending`, `ExpertHome`, `ExpertProfileSummary`) · Mock: `src/mocks/handlers/onboarding.handlers.ts`, `src/mocks/fixtures/onboarding.ts`, `src/mocks/scenarios.ts`
- E2E: `e2e/F7-expert-onboarding.spec.ts`

## Access rules (`OnboardingGate`)

| Vetting status            | Can open             | Everything else redirects to |
| ------------------------- | -------------------- | ---------------------------- |
| Not started / in progress | `/expert/onboarding` | `/expert/onboarding`         |
| Pending / changes needed  | `/expert/pending`    | `/expert/pending`            |
| Approved                  | All expert pages     | —                            |

The side nav is hidden until the expert is approved; the header keeps theme, notifications and account (log out). Sara (demo expert) is approved.

## Steps (`ProgressIndicator`, vertical at `lg+`, 5 steps)

| #   | Step                   | Fields                                                                                                                                        | Rules                                                        |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Basics                 | Headline, years of experience (`NumberInput`), country (`Select`), LinkedIn (optional)                                                        | Headline 10–90 chars; 1–60 years; LinkedIn `/in/` link       |
| 2   | Work history           | Repeatable roles: company, role, from / to (or _Present_); add up to 6, remove                                                                | ≥ 1 role; end ≥ start                                        |
| 3   | Expertise & regions    | Industries, topics (≤ 8), regions, interview languages (`FilterableMultiSelect`)                                                              | ≥ 1 of each                                                  |
| 4   | Compliance & conflicts | Employment (radio; _not sure_ shows a warning), companies you can’t discuss (`TextArea`, 500 chars), public-official checkbox, 3 declarations | All declarations confirmed                                   |
| 5   | Submit                 | Read-only summary per section with **Edit** buttons → **Submit for review**                                                                   | Disabled with a warning until all four sections are complete |

- **Save and continue** saves each step; the stepper lets the expert jump to any completed step. Headline becomes the account title.
- Clients never see the expert’s name — the Basics step says so (anonymous experts, decision 2026-10-15).

## Pending approval page

| State          | Shows                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| In review      | _In review_ tag, submitted date, “You’ll hear from us by …” (2 business days), what happens next (3 steps), support email                     |
| Approved       | _Approved_ tag, date → **Browse open calls**, **Go to expert home**                                                                           |
| Changes needed | _Changes needed_ tag, reviewer’s note (what to change) → **Update and resubmit** reopens the profile at the review step, with the note pinned |

## States and how to reach them

| State                                  | How                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Loading (stepper / page skeletons)     | Toolbar _Slow network_                                                     |
| Profile failed to load (retry)         | Toolbar _API error_, reload                                                |
| Save failed (answers kept)             | _API error_ on, then **Save and continue**                                 |
| Pick lists failed / empty              | _API error_ or _Empty data_ on, open step 1 or 3                           |
| Approve / reject a pending application | Toolbar **Scenarios → Approve expert / Reject expert** (as the expert)     |
| Start again as a brand-new expert      | Toolbar **Scenarios → Restart onboarding** (as any expert, including Sara) |
| Profile locked                         | Approved expert opens `/expert/onboarding`                                 |

## Decisions

- Experts can’t browse calls until approved: the review protects clients and keeps the first open-calls experience relevant. The pending page sets a date expectation instead.
- Rejection is framed as “changes needed” with one actionable note; resubmitting keeps all answers.
- Work-history years use selects (not free text) so dates are always valid; “Present” is the empty end year.

## Open / next

- Screenshots for this spec (light + dark).
- Admin side of the decision (F12) will replace the toolbar scenario.
- Editing an approved profile (re-review) is not designed yet; the profile is read-only in F17.
