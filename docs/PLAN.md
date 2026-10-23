# ApronHanger Candidate App — Build Plan

Build the candidate app for Android and iPhone in 5 phases over 8 weeks, from empty repo
to live on both stores. The 5 phases sit inside the 3 parts promised to the client.

| Phase | Weeks | What | Client part |
| --- | --- | --- | --- |
| 1. Foundation and login | 1 | Repo, tooling, all test layers, design system, login, signup, forgot password | Part 1 |
| 2. Jobs | 2 | Home, search, filters, job details, saved, government and international jobs | Part 1 |
| 3. Apply and applications | 3 | Apply flow, uploads, My Applications, interview and offer actions, first test builds | Part 1 (delivery) |
| 4. Profile, backend, notifications | 4–5 | Profile builder, CV PDF, all backend upgrades, push, app links, account deletion | Part 2 (delivery) |
| 5. Hardening and launch | 6–8 | Feedback rounds, device testing, store listings, submission, go-live, handover | Part 3 (go-live) |

Each phase ends with every test green, a Maestro run on Android, and a short screen recording for the client.

---

## 1. Ground rules

- The website and backend repo (`job`, branch `conflict-resolution1`) is the reference. Read-only in Phases 1–3.
- The app talks to the existing backend. No data moves. Existing candidates log in with the same email and password.
- Backend changes are additive only (new endpoints, new tables, new optional fields). The website must keep working unchanged.
- Test-driven: test first, then code. See `CLAUDE.md`.
- Before Phase 4 starts, confirm which commit is actually deployed on Render (Render dashboard shows the commit).
  Backend work must branch from that commit, not from an assumption.

## 2. Architecture

```
App (Expo, iOS + Android)
  └── src/api/client.ts ──HTTPS──> Existing backend (Express on Render) ──> Neon Postgres
                                         ├── Cloudinary (files)
                                         ├── Fast2SMS (OTP), Brevo (email)
                                         └── Expo Push -> FCM / APNs   (new in Phase 4)
```

Folder layout (follow the Expo template for where routes live):

```
app/                  Expo Router routes: (auth)/..., (tabs)/..., job/[id], apply/[jobId], ...
src/
  api/                client.ts, endpoints/*.ts, schemas/*.ts (Zod), errors.ts
  features/           auth/, jobs/, apply/, applications/, profile/, notifications/, account/
  components/ui/      Button, Input, OtpInput, Screen, Card, Badge, EmptyState, ErrorState, Skeleton, Toast
  lib/                env.ts, secureStorage(.native|.web).ts, logger.ts, sentry.ts, queryClient.ts, linking.ts
  theme/              tokens.ts (hex colours from website), typography.ts, spacing.ts
  test/               msw/handlers.ts, msw/server.ts, fixtures/, render.tsx (providers wrapper)
tests/contract/       API client against local reference backend
e2e/web/              Playwright specs (Chromium)
e2e/maestro/          Maestro flows
scripts/              backend-local, drift-check, seed helpers
docs/                 PLAN, PHASE-x, DECISIONS, SETUP, reference/API.md, reference/SCREENS.md
```

Key technical choices:

- **API client**: one fetch wrapper. Base URL from env, `Authorization` header, `X-App-Version` and
  `X-Platform` headers on every call (backend can use them later), 20 s timeout, retry only for GET,
  every error normalised to `ApiError { kind: network | timeout | http | parse, status, message }`.
- **Responses parsed with Zod**. If the backend changes shape, we find out in tests and Sentry, not from users.
- **Auth**: token in SecureStore. On start, restore token then call `/api/auth/me`. 401 anywhere → clear
  session → login screen. Built so refresh tokens (Phase 4) drop in without touching screens.
- **Candidate only**: the backend login serves all roles. The app rejects RECRUITER/ADMIN logins with the
  website's message (`rolePortalMismatchMessage`).
- **Offline/slow network**: TanStack Query with `onlineManager` and `focusManager` wired to RN. Clear
  offline banner. No silent failures.
- **OTA updates**: `expo-updates` is in the first binary (runtime version = fingerprint policy), so later
  JS-only fixes can ship without a store release. Production OTA only with Raj's OK.
- **IDs (permanent once published)**: Android package and iOS bundle ID `in.apronhanger.candidate`
  (`.dev` / `.preview` suffixes for non-production variants so all can be installed side by side).
  URL scheme `apronhanger`. Confirm in `docs/DECISIONS.md` before the first EAS build.

## 3. Environments

| Env | Backend | Used by | Notes |
| --- | --- | --- | --- |
| local | `npm run backend:local` (copy of reference backend + free dev Neon database, no Docker) | Contract tests, phone/emulator, Playwright | Seeded test data. OTP via local test patch (D3). |
| staging | Separate Render service + Neon branch (empty schema + seed, no real user data) | EAS cloud E2E (iOS simulator), Phase 4 backend testing | Needed by week 4. Cloud runners can't reach your laptop. |
| production | Live backend | Client test builds (Part 1 and 2), store builds | Only test hospital + test job + test candidate for checks. Never automated tests. |

App variants via `APP_VARIANT` in `app.config.ts`: `development`, `preview`, `production`
(different name, icon badge, bundle ID suffix, API URL, Sentry environment).

## 4. Testing strategy

| Layer | Tool | Runs | Gate |
| --- | --- | --- | --- |
| Unit | Jest + jest-expo | Every save (watch), every commit, CI | ≥ 85% lines on `src/api`, `src/lib`, `src/features/**/logic` |
| Screen | RNTL + MSW | Every commit, CI | Every screen: loading, error, empty, success, validation |
| Contract | Jest vs local backend | Before each phase sign-off; after backend changes | All endpoints we use parse with our schemas |
| Drift | `npm run drift-check` (GET on production public endpoints) | Weekly + before releases | Zero schema errors |
| Web E2E | Playwright + Chromium on Expo web | Claude Code loop, before commits that touch UI | Core flows pass |
| Native E2E | Maestro on Android emulator (local) | End of every task that touches a flow | Phase flows pass |
| iOS E2E | Maestro on EAS Workflows (iOS simulator, cloud) | End of each phase | Phase flows pass |
| Real devices | Client + our phones, low-end Android, small iPhone | Part 1, Part 2, Phase 5 | Phase 5 checklist |

CI (GitHub Actions): lint, typecheck, Jest on every push and PR. EAS Workflows for builds and cloud
Maestro runs on demand (they use build credits).

## 5. Phases

### Phase 1 — Foundation and login (week 1)

Goal: a solid base where every test layer works, and a candidate can sign up, log in, reset their password
and stay logged in, on the Android emulator against the local backend.

Scope: reference inventory (API.md, SCREENS.md), Expo project, tooling, all 5 test layers working,
local backend, API client, secure storage, auth store, theme, base UI components, navigation shell,
login, signup with OTP, forgot password, logout, session restore, Sentry, expo-updates.

Exit: see `docs/PHASE-1.md`. Client gets a screen recording of login and signup.

### Phase 2 — Jobs (week 2)

Scope:
- Tabs: Home, Search, Applications, Profile (match website sections)
- Home feed: recommended jobs with match score, categories rail, pull to refresh
- Search: text, filters (role, city, salary, experience, job type), sort; filters kept in state across tabs
- Job details: all fields as on website, similar jobs, save/unsave with optimistic update and rollback
- Saved jobs list
- Government jobs and international jobs lists and details; outside links open in `expo-web-browser`
- FlashList for lists, image caching with expo-image, skeleton loaders
- Backend returns up to 50 jobs per call (as the website). No infinite scroll unless backend adds paging.

Tests: schemas for every job type (fixtures recorded from local backend), filter logic unit tests,
screen tests for each list/detail state, Maestro: browse → open job → save → see in saved; search with filters.

Exit: parity checklist with website job screens, all tests green, Android Maestro + Playwright pass.

### Phase 3 — Apply and applications (week 3) → Part 1 delivery

Scope:
- Apply chooser same as website: quick apply with profile (website rule: profile completeness ≥ 30%),
  apply with job questions, apply by uploading own CV
- File picking: documents (expo-document-picker), camera and gallery (expo-image-picker).
  Same type and size limits as backend (backend checks magic bytes). Upload progress, cancel, retry.
- My Applications: list, status badges (same statuses and wording as website), details
- Interview card: date, venue or meeting link, accept, decline, ask for reschedule
- Document requests: upload requested documents
- Offer letter: view, download/share, accept or reject
- First test builds: Android APK (EAS `preview`, internal distribution). iPhone via TestFlight if the
  client's Apple account is active, otherwise iOS simulator run on EAS + screen recording.

Tests: upload helper unit tests (type/size/multipart), every action's success and failure path,
Maestro: quick apply, apply with CV, accept interview, accept offer (using local backend seed states).

Exit: Part 1 build installed on client's phone, Part 1 checklist in SOW met.

### Phase 4 — Profile, backend upgrades, notifications (weeks 4–5) → Part 2 delivery

App:
- 15-step profile builder, same steps, fields and checks as the website; save per step; resume later
- Profile photo, document vault, CV preview, CV PDF made on the phone (expo-print) and shared (expo-sharing)
- Notifications list, mark as read, tap to open the right screen
- Push: ask permission at a useful moment (after first apply or from settings), not on first launch
- Deep links: push payloads, email links and universal/app links all go through one router in `src/lib/linking.ts`
- Settings, logout, delete account (with confirm + password), force-update screen, feature flags

Backend (job repo, new branch from the deployed commit, Vitest + Supertest TDD, additive only):
1. OTP test mode for non-production (if not done in Phase 1)
2. Refresh tokens: short access token + rotating refresh token, reuse detection, logout and password
   reset revoke (use existing `tokenVersion`). Website keeps working with its current token.
3. Rate limits per mobile/email/account instead of per IP (Jio/Airtel shared IPs), with a higher IP safety net
4. Push tokens table + send via Expo Push wherever a notification is created; handle receipts and delete dead tokens
5. Account deletion endpoint: delete profile, CV, photo, documents (Cloudinary too), anonymise old
   applications, revoke sessions. Also a delete-account page on the website.
6. App config endpoint: minimum supported version per platform + feature flags
7. App link files: `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` on the candidate domain
8. Privacy policy page

Release: staging first (website + app regression), then production with a Neon backup/branch taken first.

Tests: every backend change has Vitest tests, including "website still works" tests for changed routes.
App: refresh flow unit tests (parallel 401s refresh once), deep link router tests, push handler tests,
Maestro: full profile builder, delete account, open-from-notification.

Exit: Part 2 builds on Android and iPhone with everything working on the live backend. Feedback round 1 starts.

### Phase 5 — Hardening and launch (weeks 6–8) → Part 3

Week 6:
- Feedback round 1 fixes
- Device matrix: low-end Android (2–3 GB RAM), mid Android, latest Android 16, small iPhone, latest iPhone;
  font scale max, dark mode on (app stays readable), slow 3G, airplane mode mid-action
- Performance: cold start, list scroll, memory; remove unused deps; Hermes on
- Security: no tokens/PII in logs, Sentry scrubbing verified, HTTPS only, SecureStore only
- Accessibility pass: labels, focus order, touch targets ≥ 44 pt, contrast
- Updated build, feedback round 2

Week 7:
- Round 2 fixes, full regression (all Jest + Maestro on Android + iOS on EAS)
- Store listings, screenshots, data safety (Google), App Privacy (Apple), content rating, age rating,
  government-info disclaimer, reviewer demo account and notes
- Production builds, submit to both stores

Week 8:
- Answer review, fix if asked
- Play staged rollout (20% → 50% → 100%), App Store release; watch Sentry crash-free rate
- Handover: repo, EAS project, Firebase, Sentry, Gmail account, docs (how to build, release, OTA, rotate keys)

## 6. Open decisions (fill in `docs/DECISIONS.md`)

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| D1 | Computer | Decided: Windows, 8 GB, no Mac. Real Android phone first; iOS via EAS cloud + real iPhone | Done |
| D2 | Bundle ID / package name | `in.apronhanger.candidate` (permanent) | Before first EAS build |
| D3 | OTP in tests | Decided: local patch for automated tests; Raj's number (in .env.local only) for manual real-SMS checks; backend test mode for staging | Done |
| D4 | Staging backend | Render service + Neon branch with empty schema + seed | Week 3 |
| D5 | Candidate domain for app links | Confirm which domain is the live candidate portal (repo mentions .in, .work and .org) | Week 4 |
| D6 | Which commit is live | Check Render dashboard | Before Phase 4 |
| D7 | Expo / Sentry / Firebase account | Decided: Raj's new project Gmail; hand over at the end | Done |
| D8 | EAS plan | Decided: Free; Starter ($19/month) only if builds run out in weeks 3–8 | Done |

## 7. Risks

| Risk | What we do |
| --- | --- |
| Live branch differs from reference | Drift check weekly; confirm deployed commit before Phase 4 |
| No Mac, 8 GB RAM | Real Android phone as main device; cloud iOS simulator on EAS + TestFlight on a real iPhone from week 3 |
| Store accounts late (D-U-N-S) | Phases 1–3 don't need them; iOS checks run on simulator builds |
| OTP blocks automated tests | Decision D3 |
| Backend change breaks website | Additive only, tests on both, staging first, DB backup, quick rollback |
| Expo SDK upgrade mid-project | Stay on the SDK chosen on day 1 unless a store rule forces a change |
| Shared IP rate limits on Jio/Airtel | Phase 4 per-user limits before go-live |
