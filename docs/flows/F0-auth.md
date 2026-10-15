# F0 Landing → sign up / log in → role select

- Status: Built (prototype) · 2026-10-15
- Routes: `/sign-up` (role select) → `/sign-up?role=client|expert` → `/verify-email`; `/login`; `/forgot-password` → `/reset-password?token=…`; `/role-select` redirects to `/sign-up`. Admin: `/admin/login` (separate realm, unchanged).
- Feature: `src/features/auth` · Mock: `src/mocks/handlers/session.handlers.ts`, `src/mocks/store/accounts.ts`, `src/mocks/fixtures/oauth.ts`
- E2E: `e2e/F0-auth.spec.ts`

## Screens

| Screen          | Key elements                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role select     | `TileGroup` of two `RadioTile`s (_I need research_ / _I’m an expert_) → **Continue**. Landing’s “Join as an expert” preselects expert (`?role=expert`).              |
| Sign up         | “Signing up as … · Change”; **Continue with Google / LinkedIn**; full name, (work) email, password with a live rules checklist, terms checkbox → **Create account**. |
| Account chooser | Passive `Modal` standing in for the provider’s screen: existing demo identities (log in) and new ones (sign up).                                                     |
| Verify email    | Pictogram, “We sent a link to …”, **Open the email link (prototype)**, **Resend email** (success notice with time), “Sign up again with a different one”.            |
| Log in          | Email + password (any password works), **Forgot password?**, Google / LinkedIn, demo persona shortcuts.                                                              |
| Forgot / reset  | Email → “Check your email” (never reveals whether the account exists) → **Open the reset link (prototype)** → new password + repeat → “Password updated”.            |

## Rules

- Password: at least 10 characters with a letter and a number. Rules show as a checklist while typing; one actionable error on blur/submit.
- Email sign-up creates an **unverified** account and logs it in. The role guard (`RequireRole`) sends unverified users to `/verify-email` from any app page.
- After verifying (or a first Google/LinkedIn sign-up, which counts as verified), clients go to `/onboarding` (F1) and experts to `/expert/onboarding` (F7).
- Google/LinkedIn on **log in** with an identity that has no account → “No Proptyop account uses … yet. Sign up with Google instead.”
- Email already registered → “An account already uses this email. Log in instead, or reset your password.”
- Admin accounts are refused on the main login and on Google/LinkedIn; clients and experts are refused on `/admin/login`.

## Mock identities (account chooser)

| Provider | Identity                     | Result                                         |
| -------- | ---------------------------- | ---------------------------------------------- |
| Google   | Ayesha Rahman (meridiangulf) | Logs in as Ayesha                              |
| Google   | Layla Nasser (gmail)         | New account on sign-up; “no account” on log in |
| LinkedIn | Sara Al-Mansouri             | Logs in as Sara                                |
| LinkedIn | Karim Aziz                   | New account on sign-up; “no account” on log in |

## States and how to reach them

| State                            | How                                                     |
| -------------------------------- | ------------------------------------------------------- |
| Field validation                 | Submit an empty sign-up / log-in form                   |
| Email already registered         | Sign up with `sara.almansouri@mail.example`             |
| Account not found                | Log in with an unknown email, or Google → Layla Nasser  |
| Wrong realm                      | Log in on `/login` with `omar@proptyop.example`         |
| Server error on submit / chooser | Toolbar _API error_ on, then submit or open the chooser |
| Slow submit / chooser skeleton   | Toolbar _Slow network_                                  |
| Unverified account redirected    | Sign up with email, then open `/home` directly          |
| Resend confirmation              | **Resend email** on the notice                          |
| Expired / incomplete reset link  | `/reset-password?token=expired`, or `/reset-password`   |

Demo persona buttons and the toolbar persona switch still log in directly (they skip the _API error_ toggle so the toolbar always works).

## Decisions

- Role select is step 1 of sign-up rather than a step after it, so the account form can say what the account is for (work email for clients) and Google/LinkedIn sign-up knows the role.
- No real email is sent: the notice has a clearly labelled prototype button that does what the emailed link would.
- Passwords are never stored by the mock; any password logs in.

## Open / next

- Screenshots for this spec (light + dark).
- Two-step verification at log in is shown only as a setting (F17).
