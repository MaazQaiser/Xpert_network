# Super Admin Console Plan (project manager app)

> Status: v0.2 (plan, not built) · Owner: Maaz · Last updated: 2026-10-22
> Source: **ExpertNet — AI Expert Network PRD** (@Ayaan, 2026-10-22) and its 28 wireframe screens. This file turns the PRD into a build plan for this repo. Where the PRD and this repo disagree, §2 says which wins until decided.
> Same rules as the rest of the repo: front-end prototype, everything mocked behind `src/mocks`.

---

## 1. What the console is

The console is where an internal **project manager** turns a client's emailed brief into booked expert calls. AI reads, matches, ranks and drafts at every step. A person approves anything that leaves the building or commits money or time.

| Role | Persona (fixtures) | Where they work |
|---|---|---|
| Project manager (internal) | **Paltu Kerison** | The console, with the sidebar |
| Client | **Sarah Lin**, Helix Capital Partners | Their own email, plus a private pick page (no login) |
| Expert (in network) | **Expert #4821**, and Sara in the existing expert app | The expert app if they have an account, or the same screens through a private link from email (§3a) |
| Applicant (outreach) | **Katarzyna Wójcik** | Email reply to a hiring poster, plus an onboarding link; becomes an expert account once onboarded |

Seed project: **PRJ-1042** for Helix Capital Partners. Link pages expire after 48 hours.

**Decided 2026-10-22:**

- The **client app stays as it is**, separate from this journey. The project manager's journey starts from an email. Clients in this journey use email and the pick page.
- The **expert app is updated** to serve this journey (§3a).
- Product name stays **Xpert Network**. Fixture addresses use `xpertnetwork.example` (e.g. `experts@xpertnetwork.example`).
- Wireframes are greyscale (HTML, Figma or PNG); they're layout and content references.

---

## 2. Conflicts with the current repo (to decide)

| # | PRD says | Repo today | Plan until decided |
|---|---|---|---|
| 1 | Clients and experts **never log in** | Client app and expert app with logins | **Decided:** client app unchanged and separate; expert app updated so experts can use either their account or a link (§3a) |
| 2 | Product name **ExpertNet** | **Xpert Network** | **Decided:** Xpert Network |
| 3 | Wireframes are **shadcn/ui, Geist, zinc**, colour added later | **Carbon v11** + Xpert Network theme (ADR 0002, 0009), a non-negotiable in `CLAUDE.md` | Build in Carbon, using the greyscale wireframes for layout and content (§7). Switching to shadcn would need a new ADR |
| 4 | **Drawers** for edit forms (experts, clients) | Core Carbon has no drawer; `@carbon/ibm-products` (which has `SidePanel`) isn't installed | Decide in an ADR: add `@carbon/ibm-products` or build a `SidePanel` in `src/shared/ui` |
| 5 | Selection actions in a **bottom bar** | Carbon `DataTable` puts batch actions in a toolbar at the top of the table | Build a sticky bottom `SelectionBar` in `src/shared/ui`, using the same tokens as Carbon's batch actions |
| 6 | Billing and payouts are non-goals | Wallet, credits and expert earnings exist | Console has no finance or payouts screens |

Earlier plan items that are **dropped**: the request inbox as a replacement for quotes, expert vetting queue, open calls builder, interview checks, report publishing, finance and users screens. **Kept** from the earlier plan (not in the PRD; requested separately): team management, assignment of work and a console-wide audit log (§6).

---

## 3. Flows and screens

Screen numbers match the wireframes. Flow IDs are used for PRs, specs and E2E tests.

| Flow | Screens | Name | Priority |
|---|---|---|---|
| **F11** | 01 | Home: summary, AI tip, chat | Must |
| **F12 ★** | 02–03 | Inbox → client project file (AI brief) | Must |
| **F13 ★** | 04–05 | Matched experts → AI shortlist | Must |
| **F14 ★** | 06–08 | Pitch experts → expert answers the 15 questions → responses | Must |
| **F15 ★** | 09–15 | Confirm availability → client picks → sync → project locked | Must |
| F16 | 16 | Call workspace | Should |
| **F19** | 17–23 | No-match branch: outreach hiring | Must |
| **F20** | 24–28 | CRUD: projects, experts, clients, trash | Must |
| F18 | — | Team, assignment and audit log (beyond the PRD) | Should |

`PRODUCT_PLAN.md` IDs F11–F20 for admin now mean the rows above.

### Main flow (01–16)

Each screen has **one primary action**, top-right of its header, unless it acts on a selection, in which case it sits in the bottom selection bar.

| # | Screen | Who | Must show | Primary action → next |
|---|---|---|---|---|
| 01 | Home | PM | Greeting by name; today's summary (emails received, experts pending review, new projects); one AI tip; chat box with suggested prompts, attach, voice, send; recent chats | Summary cards → 02, 08, 24 |
| 02 | Inbox | PM | Three panes: sidebar, request list (sender, company, subject, file, status, time), reading pane (sticky header, confirm alert, body, **What the system did** steps, PDF preview) | Open project file → 03 |
| 03 | Client project file | PM | Draft tag; AI brief + 8 key facts; expert profile needed; 8 client questions with page refs; source document with highlights; needs confirming (2); activity | Approve & find experts → 04 |
| 04 | Matched experts | PM | Collapsible brief; tabs with *Matched experts* first: 146 matches, matched-on filters, search, selectable table (expert, role, years, country, match %, last engaged), pagination; Top 10 / 20 / 30 picker | Generate shortlist → 05 |
| 05 | AI shortlist | PM | Ranked expert cards with **why picked**, ranking weights, question coverage chart, gap warning | Pitch 8 experts → 06 |
| 06 | Pitch experts | PM | AI-drafted email with personal fields; 15-question form (8 locked client questions + 7 screening); deadline and reminders; recipients | Send to 8 experts → 07 |
| 07 | Expert answers the form | Expert | Anonymised project, pay, time estimate; progress (6 of 15); answer boxes with **Can't speak to this**; screening questions; autosave | Submit answers → 08 |
| 08 | Expert responses | PM | 6 of 8 answered; AI picks 5 that cover all 8 questions; table with status, answered, quality, coverage, compliance; answers side panel | Confirm availability for 5 → 09 |
| 09 | Confirm availability | PM | 5 experts with confirmed slots; compliance status; slots held 48 h | Send 5 experts to client → 10 |
| 10 | Send experts to client | PM | AI email to Sarah with 5 anonymised experts (role, quote, best for, free times); visibility settings; question coverage | Send to Sarah → 11 |
| 11 | Client opens the email | Client | Our email in her inbox; 5 experts with free times; reply-by-email fallback | Choose your experts → 12 |
| 12 | Client picks experts | Client | 5 experts; choose up to 2, each with a time; picks summary bar | Send my choice → 13 |
| 13 | Client's reply received | PM | Reply read by AI; 2 chosen experts and times; her note; next steps; not-picked experts on standby or released | Sync with experts → 14 |
| 14 | Sync + tell client | PM | Both experts confirmed; others released; AI message to Sarah with locked times and invites | Send to Sarah & lock project → 15 |
| 15 | Project locked | PM | Booked tag, sync checklist, locked scope v1.0, briefing pack, calls list | Open call workspace → 16 |
| 16 | Call workspace | PM | Live transcript; AI-detected client requests (documents, removed requirement, new expert need); questions covered; after-call documents | Send all to client |

### 3a. Expert side changes

What the project manager sends must land somewhere for the expert. Each screen below is **one component** used in two places: inside the expert app (`/expert/...`, for experts with an account like Sara) and as a link page (`/l/...`, for experts who only use email). Link pages have no sidebar and work on a phone.

| Expert app today | Change | PRD screens it serves |
|---|---|---|
| Home | Add **To do**: invitations to answer, availability to confirm, upcoming calls | 06, 09, 15 |
| Interview requests (open calls you browse and apply to) | Becomes the list of **invitations from the project manager** (pitches). Each opens the 15-question form. Browsing open calls becomes secondary (§10 Q1) | 06–07 |
| Call detail + screening questions | Replaced by the **15-question form**: anonymised project, pay, time estimate, progress (6 of 15), **Can't speak to this**, screening questions, autosave, submit | 07 |
| — (new) | **Confirm availability**: pick or propose time slots; see that slots are held for 48 h | 09 |
| — (new) | **Upcoming calls**: confirmed slot, invite link, **briefing pack** (sent 24 h before), client name shown only once booked | 14, 15 |
| Interview room (AI interviewer) and session | Kept as is for now; not part of the PRD journey (§10 Q1) | — |
| Onboarding (F7 profile → compliance → pending) | Add the outreach steps: **identity check, terms signed, rate agreed, payment details**. Existing experts reuse what's on file. Can be added to a project before finishing, but can't be booked until done | 22 |
| Earnings | Unchanged (payouts are a PRD non-goal) | — |

Expert-side rules from the PRD: the client's name is hidden until booked; every expert signs confidentiality terms and declares conflicts before booking; current employees of the target company are excluded automatically.

### No-match branch: outreach hiring (17–23)

When no network expert meets the brief, outreach recruits new ones. They join the same table that showed 0 and rejoin the main flow at **09**, skipping the pitch because they've already answered the 15 questions.

| # | Screen | Must show | Primary action → next |
|---|---|---|---|
| 17 | No experts match | Matched tab = 0; the blocking requirement; experts meeting each requirement; 3 closest people and what they miss | Start outreach hiring → 18 |
| 18 | Hiring poster | AI-filled, editable poster (headline, project, category, experience, region, count, pay, deadline, must-haves, how to apply); live preview in square, story and email sizes; channels | Publish poster → 19 |
| 19 | Tell the client we're recruiting | Short AI email to Sarah with the date she'll get options | Send update (or Skip) → 20 |
| 20 | Expert emails from the poster | Inbox of replies; AI tag per email (*Fits 3/3 · Fits 2/3 · Conflict · Not a fit*); CV; must-have checklist; fitting experts pre-ticked | Send 15 questions to 6 → 21 |
| 21 | 15-question results | Funnel (emailed → got questions → answered → top ranked); ranked table with answer score, client questions covered, compliance; top 4 selected | Add 4 to project → 22 |
| 22 | Onboard new experts | Per expert: identity checked, terms signed, rate agreed, payment details; existing experts reuse what's on file | Add 4 to the project → 23 |
| 23 | Back in the table | Same project page, now "4 experts match", new experts marked | Confirm availability for 4 → 09 |

Rules: applicants email `experts@xpertnetwork.example` with subject `PRJ-1042` and a CV, so replies file themselves to the project. AI screens every email and CV against the must-haves before any questions go out; conflicts are flagged and never sent. Outreach experts use the same 15-question form so scores compare. An expert can be added before onboarding is finished but can't be booked until it is.

### CRUD (24–28)

Every core record can be created, read, updated and deleted. Every delete is recoverable for 30 days.

| # | Screen | Create | Read | Update | Delete |
|---|---|---|---|---|---|
| 24 | Projects | New project, Import from email | Table: search, filters (status, client, owner, date), AI filter bar, pagination | Bulk change status, assign owner | Bulk or row menu → 28 |
| 25 | Create / edit project | From an uploaded doc (AI fills), pasted email, or blank | Version history | Brief, facts, expert profile, client questions (add, reorder, delete, restore); editing a locked project saves a new version | Remove attachments |
| 26 | Experts directory | Add expert, Import CSV, fill from CV or LinkedIn | Table with filters; AI flags duplicates to merge | Edit panel: contact, work history, tags, rate, compliance, notes | → 28 |
| 27 | Clients | Add client, or create from an unknown email domain | Cards with contacts and active projects | Edit panel: domains (match incoming email), contacts, compliance rules, anonymise toggle | → 28 |
| 28 | Delete, archive, trash | — | Trash with days left | Restore | Dialog shows what's affected (booked calls, held slots) and suggests archiving; type the ID to confirm; undo toast; small items delete inline with undo; delete forever |

---

## 4. Routes

Console routes live under `src/app/(admin)/admin/(console)/` and go into `routes.admin`. Link pages live in a new `(links)` route group with no sidebar, phone-first.

| Route | Screens |
|---|---|
| `/admin/home` (replaces `/admin/dashboard`) | 01 |
| `/admin/inbox`, `/admin/inbox/[requestId]` | 02, 20 (filtered to a project) |
| `/admin/projects`, `/admin/projects/new` | 24, 25 |
| `/admin/projects/[projectId]` → redirects to the current step | — |
| `/admin/projects/[projectId]/brief` | 03, 25 (edit), version history |
| `/admin/projects/[projectId]/match` | 04, 17, 23 |
| `/admin/projects/[projectId]/shortlist` | 05 |
| `/admin/projects/[projectId]/pitch` | 06 |
| `/admin/projects/[projectId]/responses` | 08 |
| `/admin/projects/[projectId]/availability` | 09 |
| `/admin/projects/[projectId]/client` | 10, 13, 14 (send options → reply → sync) |
| `/admin/projects/[projectId]/booked` | 15 |
| `/admin/projects/[projectId]/calls/[callId]` | 16 |
| `/admin/projects/[projectId]/outreach` (steps: poster, update, applicants, results, onboard) | 18–22 |
| `/admin/experts`, `/admin/clients`, `/admin/trash` | 26, 27, 28 |
| `/admin/team`, `/admin/team/activity` | F18 |
| `/admin/settings` | Connected inboxes, profile |
| `/admin/mail` (email sandbox) | 11 as the client sees it; every simulated sent and received email |
| `/l/pick/[token]` | 12 client picks experts |
| `/l/form/[token]` and `/expert/invitations/[projectId]` | 07 expert answers the 15 questions |
| `/l/availability/[token]` and `/expert/invitations/[projectId]/availability` | 09 expert confirms slots |
| `/expert/calls/upcoming` | 15 expert's booked calls and briefing pack |
| `/l/onboard/[token]` and `/expert/onboarding` | 22 applicant onboarding |

**Steps trail** on every project screen (Carbon `ProgressIndicator`): *Brief › Match › Shortlist › Pitch › Responses › Availability › Client › Booked*. Outreach shows as a branch from Match and rejoins at Availability.

**Sidebar (matches the wireframes):** Home · Inbox · Projects · Clients · Experts · Outreach · Scheduling · Calls. Team, Trash and Settings come later (F18, F20). The old admin nav (Dashboard, Briefs & quotes, Experts, Interview checks, Finance) is gone; `/admin/dashboard` redirects to `/admin/home`.

---

## 5. Data model and statuses

New Zod schemas in `src/features/admin/model/` (split into per-record features later if they grow).

| Record | Key fields |
|---|---|
| Client | Company, type, email domains, contacts, compliance rules, anonymise experts (yes/no), owner |
| Request (email) | Sender, subject, body, attachments, status, linked client and project |
| Project | ID (`PRJ-1042`), name, client, owner, brief, key facts, expert profile, client questions, attachments, status, version |
| Expert | Name, contact, work history, expertise tags, country, rate, compliance status, past calls and ratings, source (network / outreach), onboarding status |
| Questionnaire response | Project, expert, 15 answers, answered count, quality score, questions covered |
| Booking | Project, expert, slot, status (held / confirmed / released), invite link |
| Outreach campaign | Project, poster content, channels, applicant emails, deadline, status |
| Secure link | Token, purpose (pick / form / onboard), record, expires at, used at |
| Team member, Audit entry, Trash entry | Kept from F18 / F20 |

**Project statuses:** Draft → Matching → Shortlisted → Pitching → Scheduling → Waiting on client → Booked (locked) → Completed. Side states: Outreach, Needs client info. Archived from any state. Status is shown with an icon and words, never colour alone.

---

## 6. Cross-cutting rules

**Human approval.** AI never emails a client or expert without a person pressing send. Every send opens a confirm step showing the recipients and the final text.

**AI output** (`AI_NATIVE.md`): `AILabel` on every AI field, **why** shown (sources, reasons, weights), editable, and **Reset to AI pick**. Claims cite their source: document page, email or answer.

**Email sandbox.** Nothing is really sent. Every outgoing and incoming email in the PRD's emails table is stored and visible in `/admin/mail`, rendered as the recipient sees it, with working links to the link pages. Settings has a mocked **Connect inbox** (shared address, or Gmail / Outlook) for `experts@` and the client request address.

**Privacy.** Client names are hidden from experts and applicants until booked. Expert names are hidden from clients until booked (per-client setting). Link pages expire after 48 h; an expired link shows a clear "This link has expired" page with how to get a new one.

**Deletion.** Soft delete with 30-day trash and undo toasts; delete forever is a separate, confirmed action.

**Audit.** Every AI action and every send is logged in the project's activity. Locked projects keep versions (v1.0, v1.1). F18 adds a console-wide audit log.

**F18 Team (beyond the PRD).** Invite, deactivate (reassign their projects), remove; project **owner** is the assignment unit; workload per member (open projects, projects booked, time from email to approved brief); console-wide activity log. One role: every member has the same permissions.

---

## 7. Wireframe → Carbon mapping

| Wireframe element | Carbon |
|---|---|
| Primary / outline / ghost buttons | `Button` kind `primary` / `tertiary` / `ghost` |
| Badges (dark, gray, outline) | `Tag` (with icon for status) |
| Tabs | `Tabs` |
| Segmented controls (Top 10/20/30, poster sizes) | `ContentSwitcher` |
| Tables with selection, filters, pagination | `DataTable` + `TableToolbarSearch` + `Pagination`; bottom `SelectionBar` (§2 #5) |
| Drawers | §2 #4 |
| Dialogs, type-to-confirm delete | `Modal` (danger) + `TextInput` |
| Toasts with undo | `ActionableNotification` (toast) |
| Steps trail | `ProgressIndicator` |
| Checkboxes, pills, inputs | `Checkbox`, `Tag` (selectable), `TextInput` / `TextArea` |
| Coverage chart, funnel | `@carbon/charts-react` |
| Home chat box | Reuse `FloatingComposer` from `goal-chat` via its `index.ts` |
| PDF preview with highlights | Mocked rendered document (fixture pages with highlight ranges) |

---

## 8. Mock layer

| Change | Where |
|---|---|
| `/api/admin/*` handlers (PM session only) and `/api/links/*` handlers (token only, expiry enforced) | `src/mocks/handlers/admin/`, `src/mocks/handlers/links/` |
| Store slices: clients, requests, projects, experts, responses, bookings, campaigns, links, mail, team, audit, trash | `src/mocks/store/db.ts` |
| Seeds: Helix Capital + 4 more clients; PRJ-1042 email with PDF; ~200 generated network experts so PRJ-1042 gets 146 matches; a second project that matches 0 to demo outreach; 8 applicant emails for the poster | `src/mocks/fixtures/admin/` |
| Scripted AI: email + attachment reading, brief / facts / questions drafter with page refs, matcher and scores, ranker with weights, email drafters, answer scoring, reply parser, no-match diagnosis, poster drafter, CV screening, live call transcript and request detection | `src/mocks/ai/admin/` |
| Toolbar scenarios: *New client email*, *Expert submits form*, *Client picks experts*, *Applicant replies to poster*, *Link expired*, *Password-protected attachment*, *Email with no attachment* | `src/mocks/scenarios.ts` |

Personas: add **Paltu Kerison** (PM) to the persona picker alongside Omar. Sara (existing expert persona) is in PRJ-1042's matches so the expert app side can be demoed. Sarah Lin, Expert #4821 and Katarzyna Wójcik are records, not login personas; their link pages open from the email sandbox or the toolbar.

---

## 9. Build order

One PR per step, each with its flow spec in `docs/flows/`, a Playwright happy path, axe checks, and all four async states reachable from the toolbar.

| Step | Scope | Proves |
|---|---|---|
| 0 | ADRs for §2 #3–#5; `features/admin` scaffold, new sidebar, records + store + seeds, email sandbox, `(links)` route group with expiry | The foundation every step needs |
| 1 | **F12** Inbox → project file (02–03) | An email becomes a reviewed brief |
| 2 | **F13** Match → shortlist (04–05) | The network is searched and ranked |
| 3 | **F14** Pitch → expert form → responses (06–08), plus the expert app's invitations list and form (§3a) | Experts are screened with the client's questions |
| 4 | **F15** Availability → client pick → sync → locked (09–15), plus expert availability and upcoming calls (§3a) | Calls are booked by email, no manual scheduling |
| 5 | **F11** Home (01) | Summary and chat over real data |
| 6 | **F20** CRUD + trash (24–28) | Records are manageable and deletes recoverable |
| 7 | **F19** Outreach hiring (17–23), plus the expert onboarding additions (§3a) | A 0-match project still gets bookable experts |
| 8 | **F16** Call workspace (16) | The call feeds back into the project |
| 9 | **F18** Team and audit log | Work is owned and traceable |

Home comes after the main flow because its summary cards and chat need the real data behind them.

---

## 10. Open questions

**From this plan:**

1. Expert app: do **browsing open calls** and the **AI interview room** stay alongside PM invitations, or are they retired?
2. How does a client in this journey relate to the client app: same account (Sarah could log in and see her projects), or completely separate?
3. Build the wireframes in **Carbon** with the current theme (recommended, no stack change), or move to shadcn?
4. Drawers: add `@carbon/ibm-products` or build our own side panel?

**From the PRD:**

5. Should the 15 questions always be 8 from the client + 7 screening, or flex with the brief?
6. Should the hiring poster also offer an apply form, or stay email-only?
7. Can the client pick more than 2 experts, and who sets that limit?
8. Who sets expert rates and the client's budget, and where are they shown?
9. Which inboxes connect first: one shared address, or Gmail / Outlook per team?
10. Should outreach also start when there are only 1–2 weak matches, not just 0?

**Success metrics** (no targets yet, each needs a baseline): email to project file, email to first call booked, brief accuracy, match quality, client pick rate, outreach fill rate, PM time per project.
