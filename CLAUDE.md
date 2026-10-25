# ApronHanger Candidate App

Native Android + iOS app for the ApronHanger candidate portal. Same features as the
candidate website, same backend and database. Built with Expo (React Native).
Goal: live on Play Store and App Store, no crashes, passes store review first time.

- Master plan: `docs/PLAN.md`
- Current phase: `docs/PHASE-1.md`  <- update this line when the phase changes
- Decisions log: `docs/DECISIONS.md`
- Machine setup: `docs/SETUP.md`

## Reference repo (READ-ONLY)

- Website + backend monorepo is cloned at `../job` (`apronhanger/job`, branch `conflict-resolution1`).
- Never edit, commit, push, stash, checkout or reset anything in `../job`. Read only.
- Allowed: running a COPY of it (`.reference-backend/`) through scripts in THIS repo,
  against the dev Neon database only (D13). Never the production database.
- Source of truth for:
  - API routes and responses: `../job/backend/src/routes`, `../job/backend/src/middleware`
  - Data model: `../job/backend/prisma/schema.prisma`
  - Validation rules, wording, screen behaviour: `../job/candidates/src`
  - Colours and radius: `../job/candidates/src/styles.css` (oklch, convert to hex)
- If the app and the website behave differently, the website wins, unless
  `docs/DECISIONS.md` says otherwise.
- Backend changes happen only in Phase 4, on a separate branch of the job repo,
  and only after Raj says so. **One exception: the security hotfix (D21, below).**

## Security hotfix exception (D21): only for this hotfix

Raj built the website, so security/privacy bugs in it are fixed for free, with his approval, and nothing else is.

- `../job` stays READ-ONLY. The hotfix is done in a **separate clone, `../job-hotfix`**, never in `../job`.
- Branch from the commit that is **actually deployed on Render**. Ask Raj for it first (he checks Render → Events).
  If it is not the head of the deployed branch (`conflict-resolution1`, no hyphen before the 1), stop and tell him.
- Working branch: `hotfix/saved-jobs-privacy`. Never push to the deployed branch, never merge, never deploy, never
  touch production data. Raj reviews, merges and deploys.
- No Render API writes at all while this exception is open: never create or change a Render service (this suspends the
  staging service of D20 too; `npm run staging:deploy` stays unused until Raj says so).
- Fix only the issues Raj approved from `docs/client/ISSUES-TRIAGE.md` (group A: security/privacy).
- When Raj confirms the hotfix is live, this exception ends and the rules above apply again.
- D22: one-off exception, read-only production DB check (SELECT only, counts/IDs only) for `docs/client/A3-production-checks.sql`. Nothing else uses the production DB URL.

## Scope guard

- Build only what is in `docs/PLAN.md` (the agreed scope).
- Anything extra that Raj or the client ask for goes in `docs/CHANGE-REQUESTS.md` with an estimate in developer days.
  Don't build it until Raj approves it as a paid change.
- Website bugs: only group A (security/privacy) is fixed free, and only with Raj's OK. Everything else is listed and
  Raj decides.
- **Security holes found while reading the reference code** (leaks, missing access checks, unfiltered writes, public files):
  write them into `docs/client/ISSUES-TRIAGE.md` first, with endpoint, who can exploit it, what data and a severity.
  **Nothing is fixed without Raj's OK**, not even a one-liner, and not while working on something else.

## Stack

- Expo, latest stable SDK at project start (check https://docs.expo.dev/llms.txt), TypeScript strict
- Expo Router (file-based routes). From SDK 56 it no longer uses React Navigation; use Expo Router APIs only.
- TanStack Query (server state), Zustand (auth/session state)
- React Hook Form + Zod (same rules as the website)
- expo-secure-store (tokens), expo-image, FlashList (long lists)
- expo-document-picker, expo-image-picker, expo-print, expo-sharing, expo-web-browser
- expo-notifications (Phase 4), expo-updates, @sentry/react-native
- Tests: Jest (jest-expo) + React Native Testing Library + MSW, Playwright (Chromium, Expo web), Maestro (native)

## Commands

```
npm run start            # Expo dev server
npm run android          # run on Android emulator
npm run web              # Expo web (used only for Playwright checks)
npm test                 # Jest unit + component tests
npm run test:watch
npm run test:coverage
npm run lint
npm run typecheck
npm run check            # lint + typecheck + test. Must pass before every commit.
npm run e2e:web          # Playwright on Chromium against Expo web
npm run e2e:android      # Maestro flows on the running Android emulator
npm run backend:local    # reference backend copy + dev Neon DB on http://localhost:3000 (no Docker)
npm run drift-check      # read-only GET calls to production, parsed with our schemas
```

## How we work: TDD, always

1. Write the test first. Run it. See it fail for the right reason.
2. Write the minimum code to pass.
3. Refactor. Keep it green.
4. `npm run check`.
5. Small commit with a conventional message (`feat(auth): ...`, `fix(jobs): ...`, `test: ...`).

Rules:
- No feature code without a test that needed it.
- A bug fix starts with a failing test that reproduces the bug.
- Never skip, delete or loosen a test just to get green. If a test is wrong, say why in the commit.
- Don't mock the thing you are testing. Mock the network with MSW, not our own modules.

## Which test goes where

| Layer | Tool | Location | Use for |
| --- | --- | --- | --- |
| Unit | Jest | `src/**/__tests__/*.test.ts` | Schemas, API client, validators, mappers, stores, hooks |
| Screen | Jest + RNTL + MSW | `src/**/__tests__/*.test.tsx` | Screen behaviour: loading, error, empty, success, validation, navigation |
| Contract | Jest + local backend | `tests/contract/*.test.ts` | Our API client + schemas against the real reference backend |
| Web E2E | Playwright (Chromium) | `e2e/web/*.spec.ts` | Fast UI checks of flows that don't need native modules |
| Native E2E | Maestro | `e2e/maestro/*.yaml` | Real flows on Android emulator / iOS simulator. Final word on "works". |

Playwright on Expo web is a quick check only. Native modules behave differently on web.
A flow is "done" only when its Maestro flow passes on Android.

## Code rules

- TypeScript strict. No `any`. Use `unknown` + Zod.
- All network calls go through `src/api/client.ts` (the instance; `fetch` itself lives only in its factory
  `src/api/createApiClient.ts`, which Node tools such as contract tests reuse). No `fetch` anywhere else.
- Every API response is parsed with a Zod schema in `src/api/schemas/`. Extra fields are fine
  (`.passthrough()`); missing or wrong required fields throw a typed `ApiError` and go to Sentry.
- Tokens live only in SecureStore through `src/lib/secureStorage`. Never in AsyncStorage, logs or Sentry.
- No personal data (email, mobile, name, files) in logs or Sentry. Scrub in `beforeSend`.
- Every pressable/input has a `testID` (`screen.element`, e.g. `login.submit`) and an `accessibilityLabel`.
- Layouts must work at 320 pt width and at font scale 2.0. Use safe areas; Android is edge-to-edge.
- Platform differences go in `.native.ts` / `.web.ts` / `.ios.ts` / `.android.ts` files,
  not scattered `Platform.OS` checks.
- Colours, spacing, radius, fonts come from `src/theme/` only.
- Install Expo packages with `npx expo install`. Pin versions. Prefer Expo SDK packages.
- Keep website wording for labels, errors and messages.

## Safety

- Render (live backend, real users) is **read-only**: `RENDER_API` in `.env.local` is used only for GET requests
  on services and deploys. Never deploy, restart, suspend, change settings or read env vars there.
  Nothing is pushed to `apronhanger/job` either (the hotfix branch in `../job-hotfix` is the one exception, D21).
- A **separate** Render workspace for staging (`RENDER_STAGING_API` in `.env.local`) may be changed: it only ever holds
  the test backend (dev database, OTP test mode). Only the production build talks to the live server (D20).
  Suspended while the D21 hotfix exception is open.
- Never call the production API from tests or E2E. The only exception is `npm run drift-check`
  (GET requests on public endpoints).
- Never commit secrets or personal data. `.env*` is gitignored (except `.env.local.example`).
  Raj's phone number lives only in `.env.local` as `TEST_MOBILE`. `EXPO_PUBLIC_*` values are public: no secrets there.
- Never run `eas submit`, `eas update --channel production` or a production build without Raj's OK.
- EAS builds and workflows cost build minutes. Ask before running them.

## Definition of done (every task)

- Tests written first and passing; `npm run check` green
- Loading, error, empty and offline states handled
- testIDs and accessibility labels added
- Checked on the real Android phone or emulator (and web via Playwright where it applies)
- Matches the website behaviour and wording
- Docs updated if behaviour or setup changed

## Machine limits

Raj's laptop: Windows, 8 GB RAM, no Mac. Don't start the emulator, Expo web, Playwright and the backend
all at once unless needed. Prefer the USB phone. Stop processes you started when done.

## Ask Raj before

- Adding any native library or any library outside the Expo SDK
- Changing navigation structure or anything in `docs/DECISIONS.md`
- Touching the job repo or any backend
- Anything that costs money (EAS builds, paid services)
