# Phase 1 — Foundation and login (week 1)

Goal: every test layer works, the app structure is final, and a candidate can sign up, log in,
reset their password and stay logged in on the Android emulator against the local backend.

Work through the tasks in order. Each task: test first, then code, then `npm run check`, then commit.
Tick the box in this file when a task is done.

Non-goals for Phase 1: job screens, push, backend code changes in the job repo, store builds.

---

## Task 0 — Decisions and accounts (Raj, before coding)

- [ ] Raj confirms D2 (bundle ID) in `docs/DECISIONS.md`
- [ ] New project Gmail created; Expo, Sentry, Neon (dev database) and Cloudinary (dev) accounts made with it
- [ ] Machine set up as in `docs/SETUP.md` (GitHub CLI logged in)

## Task 0b — Repos (Claude Code does this)

- [x] Find the reference repo with `gh repo list --limit 200` (and the orgs from `gh org list`), look for `job`.
      If more than one match, ask Raj. (Done via Git Credential Manager since `gh` isn't installed. 3 matches;
      Raj chose `apronhanger/job`.)
- [x] Clone it next to this repo, read-only use: `git clone --branch conflict-resolution1 https://github.com/apronhanger/job.git ../job`
      (the branch is `conflict-resolution1`, no hyphen; `conflict-resolution-1` does not exist)
- [x] Check `git -C ../job branch --show-current` prints `conflict-resolution1` and note the commit hash in DECISIONS.md (D6)
- [ ] Make this folder a git repo; ask Raj before creating the private GitHub repo `apronhanger-app` with `gh repo create`

## Task 1 — Reference inventory (read-only, no app code)

Read `../job` and write:

- [x] `docs/reference/API.md`: every endpoint the candidate website calls (search `../job/candidates/src`
      for API calls, then read the matching route in `../job/backend/src/routes`). For each: method, path,
      auth needed, request body/query, response JSON shape, error statuses and messages, which rate
      limiter applies (see `../job/backend/src/index.ts`).
- [x] `docs/reference/SCREENS.md`: every candidate route in `../job/candidates/src/routes`: purpose, fields,
      validation rules (copy Zod/regex exactly), states, wording, actions, endpoints used.
      Skip `messages.tsx` (coming soon) and `impersonate.tsx` (admin only).
- [x] `docs/reference/THEME.md`: colours from `../job/candidates/src/styles.css` converted from oklch to hex,
      radius, font (Inter), shadows.
- [x] Note anything odd or risky at the bottom of each file under "Notes for the app".

Facts (verified against the code at `3fa6885` during Task 1; corrections marked **[corrected]**):

- Login is email + password (`POST /api/auth/login`) and returns `{ token, user }`; JWT lasts 15 days, no refresh.
- **[corrected]** Login serves RECRUITER and CANDIDATE users only; admins are a separate table with their own
  login. The website rejects only RECRUITER, with `rolePortalMismatchMessage` (`lib/authMessages.ts`).
- **[corrected]** Signup is **two steps on one screen**: (1) name, mobile, email, password, Terms + Privacy
  consent → `POST /api/auth/signup/send-otp`; (2) OTP → `POST /api/auth/signup/verify-otp` (returns
  `signup_token`) → `POST /api/auth/register` (returns `{ token, user }`, so no separate login) → home.
  **The website has no resend button and no cooldown.**
- Forgot password: `POST /api/auth/forgot-password` → `POST /api/auth/verify-otp` (returns `reset_token`,
  `maskedEmail`) → `POST /api/auth/reset-password` (bumps `tokenVersion`, logging out every session).
  **[corrected]** `POST /api/auth/resend-otp` exists, but the website never calls it, and it only works for
  existing accounts (no use for signup).
- OTP is generated, sent, stored and checked by Fast2SMS. There is no test mode. The backend only stores
  the signup/reset tokens (DB tables, 15 min).
- **[corrected]** Rate limits are per IP, and **one `otpLimiter` (5 per 15 min) is shared** by all OTP routes
  (send, verify, forgot, verify, reset, resend). Login and register share `authLimiter` (20 per 15 min).
- **[corrected]** The website restores the session with `GET /api/candidates/me`, not `/api/auth/me`
  (`/api/auth/me` exists and works; the app may use it).
- **[corrected]** Mobile numbers are sent and stored exactly as typed; the website does no `+91` handling.
- Logout is client-only: no endpoint revokes a token.
- Website uses SSE for live notifications; the app will not (polling now, push in Phase 4).
- Details: `docs/reference/API.md`, `SCREENS.md`, `THEME.md`.

## Task 2 — Project scaffold

- [x] `npx create-expo-app@latest` with the default (TypeScript, Expo Router) template, latest stable SDK.
      Record the SDK version in `docs/DECISIONS.md`. Remove template demo screens.
- [x] TypeScript strict, `@/` path alias, ESLint (expo config) + Prettier, `.editorconfig`
- [x] `app.config.ts` with `APP_VARIANT` = development | preview | production:
      name, bundle ID / package (+ suffix), scheme `apronhanger`, API URL, Sentry env, icon badge
      (icon badge waits for the real app icon; variants differ by name for now)
- [x] `src/lib/env.ts`: validate the build config with Zod, crash early with a clear message
      (values come from `app.config.ts` `extra`, so APP_VARIANT is the single switch; Sentry DSN from `EXPO_PUBLIC_SENTRY_DSN`)
      (unit test: missing/invalid values throw)
- [x] Native folders not committed (CNG): `android/` and `ios/` in `.gitignore`
- [x] Scripts from `CLAUDE.md` exist in `package.json`
- [x] GitHub Actions: install, lint, typecheck, `npm test` on push and PR

## Task 3 — Test harness (each layer gets one passing smoke test)

- [x] Jest with `jest-expo` preset, `@testing-library/react-native`, coverage thresholds from PLAN.md
- [x] MSW (`msw/node`) server started in Jest setup; `src/test/msw/handlers.ts`; unhandled requests fail the test
- [x] `src/test/render.tsx`: renders with all providers (QueryClient with retries off, safe area, theme)
- [x] Playwright: Chromium only, mobile viewport (Pixel 7 and iPhone 13 device profiles), `webServer`
      starts Expo web; `e2e/web/smoke.spec.ts` sees the login screen
- [x] Maestro: `e2e/maestro/smoke.yaml` launches the app and sees the first screen (login once Task 8 builds it)
      (passes on the real phone, RMX3944, 2026-10-25; the build needs long paths + CMake 3.31.6,
      see SETUP.md "Android build on Windows")
- [x] `tests/contract/`: separate Jest project, runs only with `npm run test:contract`, needs local backend (health smoke test passes once Task 4 runs the backend)
- [x] Playwright MCP added to Claude Code (`.mcp.json`, see SETUP.md) so screens can be checked visually during work

## Task 4 — Local backend (without touching ../job, no Docker)

- [x] `scripts/backend-local.ts` (Node 24 runs it as TypeScript; works on Windows): copies `../job/backend` into
      `.reference-backend/` (gitignored), adds `scripts/backend-local/overlay/`, applies the edits in
      `scripts/backend-local/patches.ts`, writes its `.env` from `.env.local`, runs `npm ci`, `prisma migrate deploy` + `prisma db push` (migrations lag the schema, API.md note 17) on the **dev Neon database** (D13), the backend
      seed, our seed, then starts the server on port 3000. Refuses non-Neon hosts, `NODE_ENV=production`, and a
      database with users but no seed account.
- [x] `.env.local` (gitignored) + `.env.local.example` (committed, no real values): dev database URL,
      dev Cloudinary keys (D14), dummy Brevo key, `ALLOWED_ORIGINS_CANDIDATE=http://localhost:8081`,
      `OTP_TEST_MODE`, `OTP_TEST_NUMBERS`, `TEST_MOBILE`
- [x] OTP test patch (`scripts/backend-local/patches.ts` + `overlay/src/lib/otpTestMode.ts`; exact-text edits instead
      of a `.patch` file because the job checkout has CRLF line endings): when `OTP_TEST_MODE=true` and not
      production, skip Fast2SMS and accept `123456` for numbers in `OTP_TEST_NUMBERS`. `TEST_MOBILE` is NOT in that
      list: it gets a real SMS, for Raj's manual checks only (D3), and needs real Fast2SMS keys in `.env.local`.
- [x] Registration and other flows don't crash without email: the backend gets an empty `BREVO_API_KEY` and skips
      sending (built-in behaviour, no patch needed)
- [x] Seed (`scripts/backend-local/overlay/app-scripts/seedData.ts` + `seedApp.ts`): test candidate with known
      email/password, a recruiter account (to test role rejection), 2 hospitals and 4 jobs. Idempotent (upserts).
- [x] Phone reaches the backend with `adb reverse tcp:3000 tcp:3000` (in `e2e:android`; checked on the phone 2026-10-25)
- [x] Document all of this in `docs/SETUP.md` → "Local backend"

## Task 5 — Core libraries (TDD)

- [x] `src/api/errors.ts`: `ApiError` with kinds network | timeout | http | parse; map backend `{ error }` messages
      (5xx → website "Server error..." wording; `serverMessage` kept for screens)
- [x] `src/api/client.ts` tests first (MSW): base URL, JSON body, `Authorization` when signed in,
      `X-App-Version` + `X-Platform` headers, 20 s timeout, GET retried once on network error and never
      for POST/PATCH/DELETE, Zod parse of every response, 401 calls the session-expired hook once
      (per signed-in token). Parse errors go to `setErrorReporter` (wired to Sentry in Task 7).
- [x] `src/lib/secureStorage.native.ts` (expo-secure-store) and `.web.ts` (memory only, dev use) with the same interface
      (`secureStorage.ts` re-exports native for TypeScript; unreadable Keystore entry → treated as signed out)
- [x] `src/features/auth/sessionStore.ts` (Zustand): `restoring | signedOut | signedIn`, `signIn`, `signOut`,
      `restore` (token → `/api/auth/me` → signedIn, or clear on 401/parse error; keep session on network error)
      Also: 403 → signed out as `blocked` with the backend message; non-CANDIDATE refused; user cached for offline.
- [x] `src/lib/queryClient.ts`: TanStack Query wired to RN `onlineManager` (expo-network) and `focusManager` (AppState).
      Queries retry network/timeout/5xx up to twice; never 4xx, 429 or parse errors; mutations never.
- [x] `src/lib/sentry.ts`: init only when DSN set and not in tests; `beforeSend` scrubs emails, phone numbers,
      tokens, request bodies (unit-test the scrubber: `src/lib/sentryScrub.ts`). The Sentry config plugin
      (source maps) waits for Task 10, when the Sentry org/project and EAS exist.
- [x] `expo-updates` installed and configured (runtime version policy `fingerprint`), checks disabled in development.
      Release variants stay off until `EAS_UPDATE_URL` exists (Task 10, `eas init`).

## Task 6 — Theme and base components (TDD)

- [x] `src/theme/tokens.ts` from THEME.md; Inter via `@expo-google-fonts/inter`; splash held until fonts load
      (`src/theme/FontGate.tsx` in the root layout; error text `#D4212D` per D15, gradients per D16;
      contrast of every text/background pair tested ≥ 4.5:1)
- [x] Components with tests for states and accessibility props: `Screen` (safe area, edge-to-edge, keyboard
      avoiding), `Button` (variants, loading, disabled), `TextInput` (label, error, helper),
      `PasswordInput` (show/hide), `OtpInput` (6 boxes, paste support, iOS `textContentType="oneTimeCode"`,
      Android `autoComplete="sms-otp"`), `ErrorState`, `EmptyState`, `Skeleton`, `Toast`, `OfflineBanner`
      (all in `src/components/ui/`, plus `AppText`; dev-only catalog at `/dev-ui` in development builds)
- [x] Every component passes `testID` and `accessibilityLabel` through
- [x] Check at font scale 2.0 and 320 pt width (Playwright screenshot at 320 px + emulator font setting)
      (2026-10-25: `/dev-ui` on the phone at font scale 2.0, everything wraps, nothing clipped;
      `e2e/web/narrow-screen.spec.ts` fails if anything is wider than 320 px. Found and fixed: OTP digits
      showed through the boxes on Android.)

## Task 7 — Navigation shell

- [x] Root layout: providers, fonts, Sentry, session restore; splash stays until `restoring` ends
      (also: Sentry reports API parse errors; online/focus managers started)
- [x] Route groups: `(auth)` (login, signup, forgot-password) and `(tabs)` (Home, Search, Applications,
      Profile as placeholders). Guard: signed out → login; signed in → tabs.
      Guards are `<Redirect>`s in the group layouts: `Stack.Protected` showed "Unmatched Route" for `/` and
      tab deep links when signed out. Tabs: `expo-router/js-tabs` with `expo-symbols` icons. Profile has Sign out.
- [x] Tests with `expo-router/testing-library` (`renderRouter`): redirect rules, back behaviour after login/logout
      (`src/test/__tests__/navigation.test.tsx`; smoke flows now expect the login screen)

## Task 8 — Auth screens (TDD, website parity)

For each screen: write screen tests (MSW) for every state first, then build it.

Found in Task 6 (phone): on Android the window resizes for the keyboard, but a field focused just before the
keyboard opens stays hidden behind it (no auto-scroll). Fixed: `Screen` scrolls the focused field above the
keyboard (`useKeyboardScroll`).

The checklist below was written before Task 1 corrected the facts; the website wins (CLAUDE.md): signup is
**two** steps on one screen (details incl. mobile → OTP), with **no resend and no cooldown** on the website.

- [x] Login: email/password validation and messages as website; server errors shown as website does;
      RECRUITER/ADMIN user rejected with website message and token not stored; loading; keyboard "next/done";
      link to forgot password and signup
- [x] Signup step 1: name, mobile, email, password with the website rules; mobile sent exactly as typed (no +91
      handling, like the website); Terms + Privacy consent → send OTP
- [x] Signup step 2: OTP entry (no resend: the website has none), wrong/expired OTP messages, "Edit signup details"
      keeps the values (D17) → register → signed in → tabs
- [x] Forgot password: mobile → OTP → shows masked email → new password → success → login
- [x] Logout (from Profile placeholder): clears token, query cache, goes to login
- [x] Session restore: kill and reopen app stays signed in; expired token → login with a clear message (D18)
- [x] Rate limit (429) messages shown clearly, not as generic errors (the backend's limiter text)
- [x] Success animation like the website (D19, Lottie)

Checked on the phone (2026-10-25): all six Maestro flows pass in one run against the local backend.
Fixed on the way: the OTP input was missing from Android's accessibility tree (opacity 0); the toast, red box and
offline banner had no accessible text on Android.

## Task 9 — End-to-end

- [x] Maestro (real Android phone or emulator, local backend): `auth-login.yaml` (includes logout), `auth-signup.yaml`
      (test number + 123456), `auth-forgot-password.yaml`, `auth-session-restore.yaml` (stop and relaunch app),
      `auth-role-rejected.yaml`. 6/6 with `smoke.yaml` in 10 min on the RMX3944. Repeatable: the seed frees the
      signup test numbers, and a local patch raises the OTP limit to 100 in OTP test mode.
- [x] Playwright (Chromium): login success, validation errors, role rejected (+ wrong password). `e2e/web/auth.spec.ts`,
      API mocked in the browser; 12/12 with the other specs on both device profiles. Found: the web build had been
      broken since Task 8 (Lottie's web player needs a package we don't ship) → `LottieAnimation.web.tsx` plays nothing.
- [x] Contract tests: login, me, register, forgot/verify/reset (test mode), public jobs list parses with our schemas
      (also gov and intl jobs; 12 tests, `tests/contract/`; they use `src/api/createApiClient.ts`, the client factory
      without React Native imports)
- [x] `npm run drift-check`: GET public jobs, gov jobs, intl jobs on production; parse only; no auth, no writes
      (`tests/drift/`, kept out of `npm test`; passed 2026-10-25: 10 jobs, 62 gov, 5 intl)

## Task 10 — EAS and iOS check (ask Raj before running builds)

- [x] `eas init` with the client organization's Expo account (`@apronhanger-candidate/apronhanger-candidate`);
      `eas.json` profiles: development, preview, production, e2e-test (`withoutCredentials`, Android APK, iOS simulator).
      Preview and development never use the live server (D20).
- [x] Cloud E2E: Expo's own Maestro jobs need the paid Starter plan (EAS refused `.eas/workflows/e2e.yml` on Free), so the
      iPhone side runs on GitHub's free macOS runners instead: `.github/workflows/ios-e2e.yml` (manual) downloads the free
      EAS iOS simulator build, boots an iPhone simulator, runs Maestro, keeps video and screenshot.
      First green run 2026-10-25: smoke flow on the iPhone simulator (run 40217086566, ~3 min). Auth flows need a backend
      the cloud can reach: staging is postponed (Raj, 2026-10-25), so only smoke runs there for now.
- [x] iPhone check: no real iPhone and no Mac (D1), so the iPhone simulator on the GitHub macOS runner stands in. A real
      iPhone (TestFlight, client's Apple account) is still needed before the App Store submission.
- [x] Free plan only (D8). Builds used: EAS 2 (iOS simulator e2e-test, Android preview: the Android one pointed at the live
      server and must not be used, D20); GitHub macOS ~3 min (30 allowance-minutes) plus Linux ~2 min.

## Phase 1 exit checklist

- [x] All tasks ticked; `npm run check` green (488 tests); coverage gates met (98.6% of lines, gate 85%)
- [x] Maestro auth flows pass on Android (the real phone, RMX3944, rather than an emulator): 6/6
- [x] Playwright auth specs pass on Chromium (12/12 on both device profiles)
- [x] Contract tests pass against local backend (12); drift check passes on production (10 jobs, 62 gov, 5 intl)
- [x] iOS: smoke flow passes on an iPhone simulator (GitHub macOS runner, EAS simulator build)
- [ ] No warnings in Metro logs: one upstream warning remains (Sentry 8.28 vs Expo Router 58, see SETUP.md); Raj chose
      to leave it for now. No `any`, no TODOs.
- [x] Screen recording for the client: signup and login on the Android phone against the local backend
      (`recordings/phase1-signup.mp4`, `recordings/phase1-login.mp4`, not in git)
- [ ] `docs/DECISIONS.md` updated (D15 to D20, done); `CLAUDE.md` "Current phase" moves to Phase 2 once Raj accepts Phase 1
