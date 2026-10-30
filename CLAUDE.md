# ApronHanger Candidate App

Native Android + iOS app for the ApronHanger candidate portal. Same features as the
candidate website, same backend and database. Built with Expo (React Native).
Goal: live on Play Store and App Store, no crashes, passes store review first time.

- Master plan: `docs/PLAN.md`
- Current phase: **Phase 4 built and revised (2026-10-30, D29), not accepted, app NOT pushed (repo still public), nothing deployed.** Read `docs/HANDOFF.md` top section, then `docs/PHASE-4-SUMMARY.md`. The 6 backend branches `feat/*` are PUSHED to `apronhanger/job` (Raj merges/deploys; staging first). Phase 3 acceptance is still conditional  <- update this line when the phase changes
- Handoff / current state: `docs/HANDOFF.md` (read it first in a new session)
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
- Backend changes are made only in the separate clone `../job-hotfix`, on a branch, and only after Raj says so
  (see "Backend and production rules" below). Raj merges and deploys.

## Backend and production rules (in force in every session; origin: security hotfix D21, closed D22)

State on 2026-10-26: hotfix PR 1 and PR 2 are live on Render (live commit `f185fe0`); see `docs/HANDOFF.md`.

- `../job` stays READ-ONLY. Backend changes (fixes, new endpoints) are made **only in the separate clone `../job-hotfix`, on a
  branch**, and only after Raj says so. Never push to the deployed branch (`conflict-resolution1`, no hyphen before the 1), never merge,
  never deploy. **Raj reviews, merges and deploys** (merge into `conflict-resolution1` = deploy, Auto-Deploy is on).
- Branch from the commit that is **actually live on Render** (check with the read-only Render API; if it is not the head of
  `conflict-resolution1`, stop and tell Raj). Each PR description has: what changed, tests, Raj's deploy steps, Rollback
  (Render → Deploys → previous deploy → Rollback). Failing test first, then the smallest fix, then a before/after replay.
- **Never create or change anything on Render** (services, deploys, settings, env vars). Only GET calls on services, deploys and logs.
  Staging is created by Raj in his own Render account later (D4); `npm run staging:deploy` stays unused.
- **Never use the production database URL again**, not even read-only, unless Raj says so. D22 was a one-time exception (SELECT-only
  A3 abuse check) and is **closed**. `../job/backend/.env.txt` holds production secrets: do not open it. A future production check
  needs a read-only Neon role created by Raj.
- Fix only the security issues Raj approved from `docs/client/ISSUES-TRIAGE.md` (group A). A5 is PARKED; A2 and B8 are untouched.
- `docs/client/` is git-ignored on purpose (triage, issues list, PR bodies, SQL): local only, never commit it.

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
  Nothing is pushed to `apronhanger/job` either, except hotfix branches from `../job-hotfix` (never the deployed branch).
- No staging service exists yet. It will be created by Raj in his own Render account, not the client's workspace (D4).
  Until then no Render writes at all. Only the production build talks to the live server (D20).
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
