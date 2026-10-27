# Phase 4 — Profile, backend upgrades, notifications (plan, NOT approved yet)

Status: **plan written 2026-10-28; built locally the same night** (what was built, what was decided and what is not proven: `docs/PHASE-4-SUMMARY.md`). Parts of this plan changed on the way: PR 3 (A5) was dropped on Raj's instruction, the push, refresh and delete work is done on local branches, nothing is deployed.
Source of scope: `docs/PLAN.md` "Phase 4". Rules: `CLAUDE.md` (TDD, `npm run check`, no Render changes, Raj merges and deploys).

## 0. Where things stand (checked 2026-10-28)

- Part 1 code is tagged `part-1` (= `bfa4ceb`), **local tag only, not pushed** (Raj asked for no pushes overnight).
- Live commit on Render, read-only API: deploy `dep-dbf61vrbc2fs738s49bg`, **`f185fe0`** (hotfix PR 2 merge), status `live`. This matches D6, `../job` HEAD and the head of
  `conflict-resolution1`. Backend branches for 4A start from `f185fe0`. Re-check right before each branch is cut (a new deploy changes the answer).
- Fact that shapes the whole 4A plan: **Render starts with `npx tsx src/index.ts`, so no `prisma migrate deploy` runs on deploy** (API.md note). Any new table
  is NOT created by merging. Raj must run the SQL/migration by hand against Neon, after a backup. Every PR below that adds a table says so.
- Website profile wizard has **16 screens**: 15 steps + "Review & Submit" (Basic Details, Medical Work Profile, Registration & Compliance, Qualifications & Training,
  Clinical Experience, Clinical Skills, Procedures, Research & Citations, Audit/Teaching/Leadership, Certifications, Availability & Preferences, Salary Expectations,
  Languages, Professional Summary, Document Vault, Review). "15-step" in the SOW = the first 15 plus the review.

## 1. Part 4A — backend (`../job-hotfix`)

Rules for every PR (same method as D21): own branch from the commit live on Render; **additive only** (new routes, new tables, new optional columns; no existing
route changes behaviour for the website); **failing Vitest/Supertest test first**, then the smallest code; a before/after replay of the website flows
(login, signup, forgot password, jobs, apply, applications, notifications, profile save) against the dev copy, with the replay output saved in the PR body;
**staging first** (Raj's Render staging, D24), then production. Nothing is pushed to `conflict-resolution1`; Raj reviews, merges, deploys.

Every PR body has: what changed · tests · replay result · **Raj's exact deploy steps** · **Backup step (only if the PR touches the database)** ·
**Rollback** (Render → Deploys → previous deploy → Rollback; for a table: the `DROP` statement, safe because nothing else reads the table).

**Backup step before any migration** (Raj, in Neon console): create a branch from the production main branch named `pre-<pr-name>-<date>`
(Neon keeps history; branch creation is instant and free), note the time, then run the migration SQL on staging first, then on production. Do not delete the branch until the PR has been live a week.

Order: smallest and lowest risk first. Each is its own PR and can be deployed alone. Estimates are developer days incl. tests and replay.

| PR | Change | Touches DB? | Risk | Est. |
| --- | --- | --- | --- | --- |
| **3** | **A5** (a parked item, details in local `docs/client/`). **Dropped 2026-10-28 (Raj): nothing changed; the question for the client is in `docs/client/CLIENT-QUESTIONS.md`.** | no | n/a | 0 |
| 4 | **App config** `GET /api/app-config`: min version per platform + feature flags. Flags live in environment variables / a code constant, no table. | no | very low | 0.5 |
| 5 | **Privacy policy + delete-account web pages** (static; the website already has `privacy-policy.html`) and the **app-link files** `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association`. Hosting place depends on D5 answer (website host vs Render). | no | very low | 0.5–1 |
| 6 | **Rate limits per mobile/email/account** next to the existing IP limiter (IP limit raised, not removed). Only auth/OTP/search limiters change. | no | low–medium (can lock users out if wrong; tested with a replay of 429 behaviour) | 1 |
| 7 | **Push tokens** table `PushToken(id, userId, token, platform, createdAt, lastSeenAt)` + `POST/DELETE /api/push-tokens` + send through Expo Push where `InAppNotification` rows are created (`applicationRoutes`, `cronJobs`, `adminHospitalRoutes`, `paymentRoutes`, `planRoutes`; the send is inside try/catch, a push failure never fails the request) + receipts job that deletes dead tokens. | **yes, new table** | medium | 2 |
| 8 | **Refresh tokens**: `RefreshToken(id, userId, familyId, hashedToken, expiresAt, revokedAt, replacedBy)`, `POST /api/auth/refresh`, rotation + reuse detection (reuse kills the family), logout and password reset revoke (existing `tokenVersion`). The existing login keeps returning the same access token for the website; the app sends `X-Platform` and receives refresh fields in an **additional** field. | **yes, new table** | medium–high (auth) | 2.5 |
| 9 | **Account deletion** `DELETE /api/auth/me` (password required): deletes profile, CV, photo, documents (Cloudinary too), anonymises applications (they are RESTRICT-linked, so the candidate row is anonymised, not removed), notifications, push/refresh tokens, revokes sessions, soft-deletes the User (`deletedAt` exists). Idempotent and resumable (Cloudinary failure does not leave a half-deleted account: DB part is one transaction, Cloudinary failures are logged and retried by a sweep). Website delete-account page uses it. | no new table (uses existing columns) but **irreversible data loss** | **highest** | 3 |

Why this order: 4, 5 are static/read-only. 6 changes behaviour but not data. 7, 8 add tables nobody else reads. 9 is last because it deletes real data, so it gets the most testing:
every table that references User/Candidate is listed and tested one by one (schema walk), a staging dry run on a seeded account with files in the dev Cloudinary,
a test that an application keeps its status history but loses the candidate's data and files, a test that a second delete returns cleanly, a test that a suspended/other-role account cannot call it,
and the Neon backup branch before the first production use. After PR 9 is live, the first real deletion is done by Raj on a test account only.

OTP test mode (PLAN item 1) is already in staging (D24); the proper non-production switch in the backend repo is folded into PR 6 only if Raj wants staging to be a pure copy of the repo. Default: not needed, skip.

**Open item inside 4A:** CR-002 (signed links) is the real fix for public files. PR 3 does the minimum Raj/the client choose (see list below).

## 2. Part 4B — the app

TDD per CLAUDE.md. Each item: test first, `npm run check`, testIDs + accessibility labels, 320 pt / font scale 2.0, loading/error/empty/offline states, website wording.

### 4B-1 — needs no new backend (start here, in this order)

1. **Settings screen + logout + About/Privacy links** (Profile tab). Smallest; gives the other items a home. Privacy link points at the website policy until PR 5 is live.
2. **Profile photo**: camera/gallery (already installed packages), `POST/DELETE /api/upload/avatar`, 5 MB check on the phone, quality 0.7.
3. **Profile builder, 16 screens**: same fields, validation (Zod copied from website rules), wording. Save per step with `PUT /api/candidates/me` (allow-listed, PR 2), resume at the saved step, review step, completeness %.
   Replaces the Phase 3 placeholders ("Start form", "Edit & apply", "Build my CV") per D27 item 9.
   Sub-order: steps 1–3 (basic, work, registration) → list steps (qualifications, experience, skills, procedures, research, audit, certifications, languages) with one shared "repeatable row" component →
   availability/salary/summary → review. Dates are typed in the website format; **no new date-picker library** (see section 4).
   **Document Vault step: built on the website's current behaviour (A5 unchanged, Raj).**
4. **CV preview + CV PDF** made on the phone (`expo-print`) and shared (`expo-sharing`): HTML template matching the website's CV layout; needs `expo-print` (new native package).
5. **Notifications list** with `GET /api/notifications`, mark read, mark all read, tap → router. Works with polling and no push. (The tap-to-screen router `src/lib/linking.ts` is built here, with tests for every link shape the backend writes into `InAppNotification.link`.)

B8 rule for 3: the profile builder must **not** make the open phone-number item worse (details in local `docs/client/`). Until Raj decides, the builder shows the sign-in phone and email read-only and always sends the account's own values. Test: a save body never contains it.

### 4B-2 — needs a 4A change live on staging first

| App item | Needs | Notes |
| --- | --- | --- |
| Document vault step + vault list | none | built, follows the website |
| Force-update screen + feature flags | PR 4 | Fail-open: if the call fails the app runs |
| Delete-account screen (confirm + password) | PR 9 | Maestro flow runs against staging only; the account is a throwaway seeded one |
| Refresh-token flow in `src/api/client.ts` | PR 8 | Parallel 401s refresh once (unit test); falls back to today's behaviour if the server sends no refresh token |
| Push permission (after first apply, or in Settings), token registration, tap-from-notification | PR 7 + Firebase + Apple | Permission is not asked on first launch |
| Universal/app links | PR 5 + D5 domain + hosting | One router (`linking.ts`) |
| Per-user rate-limit messages | PR 6 | Only wording for the new 429 case |

### Tests added in Phase 4 (from PLAN)

Refresh flow unit tests, deep link router tests, push handler tests, contract tests for each new endpoint against the local backend copy (later, when allowed), Maestro: full profile builder,
delete account (staging), open-from-notification. iOS flows are re-run before the Part 2 build (HANDOFF rule).

## 3. What Raj must give or do

| # | What | Needed for | Needed by |
| --- | --- | --- | --- |
| 1 | A5 answer from the client (question in local `docs/client/CLIENT-QUESTIONS.md`). Not blocking any more. | the client's decision | Whenever |
| 2 | **Candidate domain (D5)** is `apronhanger.work`. Still needed: where it is hosted and who has access (the candidate site looks like a Cloudflare Worker, `wrangler.jsonc`; not confirmed), so `/.well-known/*`, the privacy page and the delete-account page can be put on it. If the website team deploys it, I give them the exact files. | PR 5, app links | Start of 4B-2 |
| 3 | **Apple Developer account** (client's, Raj as team member): needed for APNs key (iPhone push), Associated Domains, TestFlight. Without it: no iPhone push, no iPhone universal link test on a real device; simulator only. | iPhone push, links | Before the Part 2 iOS build |
| 4 | **Firebase project** (project email, D7): create it, add Android app `work.apronhanger.candidate` (+`.preview`), send me `google-services.json` (not secret, still not committed to a public repo unless Raj says so: it goes in as an EAS file variable) and the FCM service-account key for Expo Push (a secret: uploaded by Raj to EAS, never pasted in chat). | Android push | Before PR 7 is tested on a phone |
| 5 | **Sentry**: re-authorise the Sentry MCP (`/mcp` in an interactive session) or open the issue in the web page, and install the preview APK once so the real install-check event can be read for personal data (HANDOFF item 3). | Phase 3 acceptance, privacy proof | Soon |
| 6 | B8 decision (details in local `docs/client/`). Until you decide, the builder never changes the sign-in phone or email. | Profile builder | Before the Part 2 build |
| 7 | Neon: do the backup branch before each migration PR (steps in each PR body), and **a read-only role** if I ever need to look at production data (D22 stays closed). | PR 7, 8, 9 | At each deploy |
| 8 | **Production on a paid always-on Render instance** (client's cost) before store submission. Not Phase 4, but staging tests of refresh/push are slow on a sleeping free plan. | Week 7 | Week 7 |
| 9 | Accept Phase 3 (preview APK install, camera/share/CV picker by hand). | Starting Phase 4 | Now |

## 4. New native packages (so the APK is rebuilt once)

Already in the app: expo-image-picker, expo-document-picker, expo-sharing, expo-device, expo-linking, expo-file-system, expo-secure-store, expo-updates, expo-web-browser, Sentry, lottie.

**Missing, native, to add in ONE step before the next EAS build:**

| Package | For | Notes |
| --- | --- | --- |
| `expo-print` | CV PDF | Expo SDK package |
| `expo-notifications` | Push + tap handling + Android channel | Expo SDK package; config plugin; needs `google-services.json` (Android) and the push entitlement (iOS) at build time |

Config-only changes in the same rebuild (no new library): Android `intentFilters` with `autoVerify` for `apronhanger.work`, iOS `associatedDomains`, notification icon/colour.
**Not added:** a date-picker library (typed dates match the website; avoids another native dependency, Raj's rule "ask before adding a library outside Expo SDK" would apply anyway).
`expo-device` is already there (needed for the push "physical device" check).

Build plan: do **all JS-only work first** (4B-1, the JS side of 4B-2 behind feature checks), then one rebuild with `expo-print`, `expo-notifications` and the link config once the Firebase file and the Apple team exist.
Until then `expo-print` can be developed against Jest mocks and a web fallback only if Raj asks for the earlier build; otherwise the CV PDF is the one 4B-1 item that waits for the rebuild to be fully checked on the phone.
EAS free plan: 15 Android + 15 iOS builds a month (D8); this plan uses about 2 Android + 1–2 iOS for Phase 4.

## 5. In Phase 4 text but NOT in the SOW / agreed scope → `docs/CHANGE-REQUESTS.md`

Read from PLAN.md "Phase 4" and the earlier docs; items below go into the change-request list with an estimate and are **not built** until Raj approves them as paid:

| ID | What | Why it is outside | Est. |
| --- | --- | --- | --- |
| CR-006 | **Dates and addresses with pickers / lookups** (date picker, city/state lookup) in the profile builder | The website uses plain text fields | 1.5 d, app only, + a native library |
| CR-007 | **Push settings by type** (job alerts, application updates) and quiet hours | PLAN has one permission prompt only | 2 d (backend 1, app 1) |
| CR-008 | **Email/SMS fallback when a user has no push token** | Not in plan | 1.5 d, backend |
| CR-009 | **Admin screen for flags and minimum version** (instead of environment variables) | PLAN has an endpoint only | 2 d |
| CR-010 | **Account deletion with a 30-day undo** | PLAN: delete with confirm + password | 1.5 d |
| CR-011 | **"Download my data" export** | Not in plan; stores do not require it, India DPDP may (ask the client) | 2 d |
| CR-012 | **"Log out other devices" / device list** | PLAN has rotating refresh + reuse detection only | 1.5 d |

Already listed and still not built: CR-001 (OTP-verified phone change), CR-002 (signed file links, the full A5 fix), CR-004 (offline cache).

Items I judged **inside** the SOW and will build: everything in PLAN.md "Phase 4" (profile builder, photo, vault, CV PDF, notifications list, push, deep links, settings, delete account, force-update, flags, and backend items 1–8).

## 6. Order of work and checkpoints

1. Raj reads this and answers section 3 rows 1, 6, 9 (the rest can follow).
2. 4A PR 4 and PR 5 (small) in parallel with 4B-1 items 1–3.
3. 4B-1 items 4–5. Checkpoint: Raj tries the profile builder on the preview APK against staging.
4. PR 6, then PR 7 and PR 8 on staging; app work for 4B-2 behind staging.
5. PR 3 (once the client answers) → vault step.
6. PR 9 last, with the full deletion test run; app delete screen after.
7. One rebuild with the new native packages; iOS flows re-run (HANDOFF rule); Part 2 build to the client; feedback round 1.

Everything above is a plan. No branch has been cut in `../job-hotfix`, no EAS build started, nothing pushed.
