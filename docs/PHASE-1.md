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
- [ ] Maestro: `e2e/maestro/smoke.yaml` launches the app and sees the login screen on the Android emulator
      (flow written; the build needs the project at `C:\dev\ah`, see SETUP.md "Known issue")
- [x] `tests/contract/`: separate Jest project, runs only with `npm run test:contract`, needs local backend (health smoke test passes once Task 4 runs the backend)
- [x] Playwright MCP added to Claude Code (`.mcp.json`, see SETUP.md) so screens can be checked visually during work

## Task 4 — Local backend (without touching ../job, no Docker)

- [ ] `scripts/backend-local` (Node script, works on Windows): copies `../job/backend` into `.reference-backend/`
      (gitignored), applies local-only patches from `scripts/patches/`, writes its `.env` from `.env.local`,
      runs `npm ci`, `prisma migrate deploy` on the **dev Neon database** (D13), the backend seed, our seed,
      then starts the server on port 3000. Refuses to run if the database URL looks like production.
- [ ] `.env.local` (gitignored) + `.env.local.example` (committed, no real values): dev database URL,
      dev Cloudinary keys (D14), dummy Brevo key, `ALLOWED_ORIGINS_CANDIDATE=http://localhost:8081`,
      `OTP_TEST_MODE`, `OTP_TEST_NUMBERS`, `TEST_MOBILE`
- [ ] OTP test patch (`scripts/patches/otp-test-mode.patch`): when `OTP_TEST_MODE=true` and not production,
      skip Fast2SMS and accept `123456` for numbers in `OTP_TEST_NUMBERS`. `TEST_MOBILE` is NOT in that list:
      it gets a real SMS, for Raj's manual checks only (D3).
- [ ] Make sure registration and other flows don't crash when the email key is a dummy (patch the copy if needed)
- [ ] `scripts/seed-app.ts`: test candidate with known email/password, a recruiter account (to test role
      rejection), a few hospitals and jobs. Idempotent.
- [ ] Phone/emulator reaches the backend with `adb reverse tcp:3000 tcp:3000` (add to `e2e:android` script)
- [ ] Document all of this in `docs/SETUP.md` → "Local backend"

## Task 5 — Core libraries (TDD)

- [ ] `src/api/errors.ts`: `ApiError` with kinds network | timeout | http | parse; map backend `{ error }` messages
- [ ] `src/api/client.ts` tests first (MSW): base URL, JSON body, `Authorization` when signed in,
      `X-App-Version` + `X-Platform` headers, 20 s timeout, GET retried once on network error and never
      for POST/PATCH/DELETE, Zod parse of every response, 401 calls the session-expired hook once
- [ ] `src/lib/secureStorage.native.ts` (expo-secure-store) and `.web.ts` (memory only, dev use) with the same interface
- [ ] `src/features/auth/sessionStore.ts` (Zustand): `restoring | signedOut | signedIn`, `signIn`, `signOut`,
      `restore` (token → `/api/auth/me` → signedIn, or clear on 401/parse error; keep session on network error)
- [ ] `src/lib/queryClient.ts`: TanStack Query wired to RN `onlineManager` (expo-network / NetInfo) and `focusManager` (AppState)
- [ ] `src/lib/sentry.ts`: init only when DSN set and not in tests; `beforeSend` scrubs emails, phone numbers,
      tokens, request bodies (unit-test the scrubber)
- [ ] `expo-updates` installed and configured (runtime version policy `fingerprint`), checks disabled in development

## Task 6 — Theme and base components (TDD)

- [ ] `src/theme/tokens.ts` from THEME.md; Inter via `@expo-google-fonts/inter`; splash held until fonts load
- [ ] Components with tests for states and accessibility props: `Screen` (safe area, edge-to-edge, keyboard
      avoiding), `Button` (variants, loading, disabled), `TextInput` (label, error, helper),
      `PasswordInput` (show/hide), `OtpInput` (6 boxes, paste support, iOS `textContentType="oneTimeCode"`,
      Android `autoComplete="sms-otp"`), `ErrorState`, `EmptyState`, `Skeleton`, `Toast`, `OfflineBanner`
- [ ] Every component passes `testID` and `accessibilityLabel` through
- [ ] Check at font scale 2.0 and 320 pt width (Playwright screenshot at 320 px + emulator font setting)

## Task 7 — Navigation shell

- [ ] Root layout: providers, fonts, Sentry, session restore; splash stays until `restoring` ends
- [ ] Route groups: `(auth)` (login, signup, forgot-password) and `(tabs)` (Home, Search, Applications,
      Profile as placeholders). Guard: signed out → login; signed in → tabs.
- [ ] Tests with `expo-router/testing-library` (`renderRouter`): redirect rules, back behaviour after login/logout

## Task 8 — Auth screens (TDD, website parity)

For each screen: write screen tests (MSW) for every state first, then build it.

- [ ] Login: email/password validation and messages as website; server errors shown as website does;
      RECRUITER/ADMIN user rejected with website message and token not stored; loading; keyboard "next/done";
      link to forgot password and signup
- [ ] Signup step 1: mobile number rules as website (+91 handling exactly as website) → send OTP
- [ ] Signup step 2: OTP entry, resend with same cooldown as website, wrong/expired OTP messages
- [ ] Signup step 3: name, email, password rules as website → register → signed in → tabs
- [ ] Forgot password: mobile → OTP → shows masked email → new password → success → login
- [ ] Logout (from Profile placeholder): clears token, query cache, goes to login
- [ ] Session restore: kill and reopen app stays signed in; expired token → login with a clear message
- [ ] Rate limit (429) messages shown clearly, not as generic errors

## Task 9 — End-to-end

- [ ] Maestro (real Android phone or emulator, local backend): `auth-login.yaml`, `auth-signup.yaml` (test number + 123456),
      `auth-forgot-password.yaml`, `auth-logout.yaml`, `auth-session-restore.yaml` (stop and relaunch app),
      `auth-role-rejected.yaml`
- [ ] Playwright (Chromium): login success, validation errors, role rejected
- [ ] Contract tests: login, me, register, forgot/verify/reset (test mode), public jobs list parses with our schemas
- [ ] `npm run drift-check`: GET public jobs, gov jobs, intl jobs on production; parse only; no auth, no writes

## Task 10 — EAS and iOS check (ask Raj before running builds)

- [ ] `eas init` with Raj's Expo account; `eas.json` profiles: development, preview, production, e2e-test
      (`withoutCredentials`, Android APK, iOS simulator)
- [ ] `.eas/workflows/e2e.yml`: build e2e-test for both platforms, run Maestro auth flows.
      Needs a backend the cloud can reach: until staging exists, run only flows that don't need the backend
      (smoke, validation), or point to staging once ready.
- [ ] Quick check on a real iPhone with Expo Go where possible (no Mac, D1)
- [ ] Free plan only (D8). Count builds; tell Raj before anything that may use up the monthly quota.

## Phase 1 exit checklist

- [ ] All tasks ticked; `npm run check` green; coverage gates met
- [ ] Maestro auth flows pass on Android emulator
- [ ] Playwright auth specs pass on Chromium
- [ ] Contract tests pass against local backend; drift check passes on production
- [ ] iOS: smoke flow passes on EAS iOS simulator (or Expo Go check if builds not approved yet)
- [ ] No warnings in Metro logs; no `any`; no TODOs without an issue
- [ ] Screen recording for the client: signup and login on Android emulator against local backend
- [ ] `docs/DECISIONS.md` updated; `CLAUDE.md` "Current phase" moved to Phase 2
