# F1 Client onboarding

- Status: Built (prototype) · 2026-10-15
- Route: `/onboarding` (client shell, side nav hidden) → `/ask?goal=<type>` (F2) or `/home`
- Feature: `src/features/onboarding` (`ClientOnboardingFlow`, `OnboardingGate`) · Mock: `src/mocks/handlers/onboarding.handlers.ts`, `src/mocks/fixtures/onboarding.ts`
- E2E: `e2e/F1-client-onboarding.spec.ts`

## Entry

- A new client lands here after verifying their email (F0), or after a first Google/LinkedIn sign-up.
- `OnboardingGate` (inside `RoleShell`) sends a client whose onboarding is **not started** to `/onboarding` from any client page — once. After the first saved step, skipping, or finishing, the client is never forced back.
- Demo clients (Ayesha, Bilal) have finished onboarding.

## Steps (`ProgressIndicator`, 3 steps)

| #   | Step              | Fields                                                                                                                                | Required                             |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | About you         | Which best describes you (investor / operator / consultant / corporate strategy / something else), job title, organisation (optional) | Segment, job title                   |
| 2   | What you research | Industries and regions (`FilterableMultiSelect`)                                                                                      | ≥ 1 of each (unless lists are empty) |
| 3   | First goal        | `RadioTile`s for the four goal types with one-line descriptions → **Start my first brief**; or **Go to my home page**                 | Goal, to start a brief               |

- **Skip setup** (ghost, top right) on every step → status _skipped_ → `/home`.
- **Back** and the stepper return to earlier steps; answers are kept.
- Each **Continue** saves the step. Job title and organisation also update the account (header panel, F17 profile).
- **Start my first brief** → `/ask?goal=invest|expand|market|other`. The goal chat (F2) opens with the goal already chosen: the first turn shows the client’s choice as their message and asks for the objective, skipping the goal-type chips.

## States and how to reach them

| State                                   | How                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Loading (stepper + text skeleton)       | Toolbar _Slow network_, reload `/onboarding`                           |
| Setup failed to load (retry)            | Toolbar _API error_, reload                                            |
| Save failed (answers kept, dismissible) | _API error_ on, then **Continue**                                      |
| Industries/regions failed (retry)       | _API error_ on, go to step 2                                           |
| No industries to choose from            | Toolbar _Empty data_ → step 2 shows an empty state; step can be passed |
| Validation                              | **Continue** on an empty step; **Start my first brief** with no goal   |
| Run onboarding again                    | Toolbar **Scenarios → Restart onboarding** (as any client)             |

## Decisions

- Onboarding is skippable and shown once; we don’t nag on later visits (UX_PRINCIPLES §3 user control). Research interests can be changed in Settings (F17).
- The side nav and wallet badge are hidden during onboarding so the task has focus; the header keeps theme, notifications and account actions.
- The goal step reuses F2’s goal types and labels so the hand-off reads as one conversation.

## Open / next

- Screenshots for this spec (light + dark).
- Use research interests to rank the library (F3) and the home page.
