# Handoff (updated 2026-10-28 night: Phase 4 built locally; Phase 3 acceptance still open)

Read this first in a new session, then `CLAUDE.md`. Short and exact on purpose.

## Where we are

- **2026-10-30 session (Raj's answers to the Phase 4 review):**
  - Built (tests first, `npm run check` green, 95 suites / 1,428 tests): bell + unread count in a top bar (D29.1), profile drafts on the phone until the last step with retry-safe final save (D29.3), native date picker `@react-native-community/datetimepicker` 9.2.1 (D29.4, new native module: needs the next EAS build), flaky job-details test fixed, store ID locked (D2), `docs/store/ACCOUNT-DELETION-DATA.md`.
  - Backend PR 9 got a second commit `a95ba54` (recruiter notifications renamed to "Deleted candidate", pending OTP/reset requests deleted). **Not run against a real database.**
  - **Pushed: the 6 backend `feat/*` branches** to `apronhanger/job` (via Git Credential Manager, user `rajendra0000`; the `GITHUB_TOKEN` in `.env.local` has no access to that repo). `conflict-resolution1` untouched (`f185fe0`, still live).
  - **Pushed on 2026-10-30 (Raj: "push it, let it be public for now"): app `main` (`0661070`) and tag `part-1`.** The repo stays public for now.
  - **Deploy plan (Raj):** all 6 PRs to STAGING first, phone test against staging, then production one PR at a time, a Neon backup branch before every PR with SQL (7, 8, 9). Staging today syncs from `../job/backend` (live code) and Render builds it from the app repo's `main` with `prisma db push`: needs a combined backend branch, a sync source switch, the app push and a preview EAS build (ask first). Not done.
  - Candidate website = Apache/cPanel static hosting (not Cloudflare): PR 5's page is uploaded by hand (see local `docs/client/PR5-body.md`).
  - Preview APK `a25efbdb` (Phase 3): FINISHED; APK link expires 2026-11-10.
- **Phase 4 was built locally overnight (2026-10-28), unpushed and undeployed.** Start with `docs/PHASE-4-SUMMARY.md` (features, the decisions I took for Raj, what is NOT proven) and `docs/PHASE-4.md` (plan, what Raj must give). App: tag `part-1` = delivered Part 1; `git log part-1..HEAD` = the Phase 4 commits (local only, `main` and the tag are not pushed). Backend: six branches `feat/app-config`, `feat/delete-account-page`, `feat/rate-limits`, `feat/push-tokens`, `feat/refresh-tokens`, `feat/delete-account` in `../job-hotfix`, all from live `f185fe0`, merge cleanly in any order, PR bodies in local `docs/client/PR4..PR9-body.md`, new tables need Raj's manual SQL on Neon (backup branch first). Open questions for the client: `docs/client/CLIENT-QUESTIONS.md`. Observations: `docs/client/PHASE-4-FINDINGS.md`.
- **Next:** Raj reviews; push decisions; Firebase/Apple/Play values; then ONE EAS rebuild (ask first) and the phone checks + the 3 new Maestro flows (written, never run) + iOS re-run. Native packages added: `expo-print`, `expo-notifications`.

- **Phase 1 and 2 accepted (Phase 2: D25). Phase 3 (Apply and applications) is BUILT and pushed; its acceptance is CONDITIONAL on (1) the Android preview build below
  and (2) Raj's by-hand checks. Phase 4 is NOT started** (do not start it in the session that finished Phase 3).
  Plan and checklist: `docs/PHASE-3.md`; summary and recording plan: `docs/PHASE-3-SUMMARY.md`; decisions D26 (permissions, confirms, uploads) and D27 (differences from the website).
  `npm run check` green (1,180 tests); contract 39 tests; Playwright 8 new specs; **Maestro 13/13 flows on the real Android phone**.
- **Phase 3 acceptance checklist (Raj):**
  1. Install the **Android preview APK** (EAS build `a25efbdb-5301-40ad-825f-6fd91c5b5bc8`, built from commit `75c080d`; install link in the chat / on the EAS build page).
     It is "ApronHanger (Preview)", talks to the **staging server** (`https://apronhanger-staging-api.onrender.com`, never the live one; the first request after a pause takes ~50 s).
  2. By hand on that build: camera photo for a document request, download/share of the offer letter, CV upload through the file picker.
  3. **Sentry install check:** the preview build sends ONE info event on its first launch (message "Install check: this preview build can reach Sentry. Scrub probe ..."), tag
     `purpose:install-check`, environment `preview`, project `apronhanger-candidate-app`, org `rajendra-3g`. It must read `[email]` and `[phone]` where the made-up probe values were
     (`probe.person@example.test`, `9876543210`) and carry no user, IP or request body. The Sentry MCP needs to be authorised again to read it (`/mcp` in an interactive session), or open
     the issue in the Sentry web page. **Not yet verified: it needs the build to be installed first.**
  4. Demo logins and the seeded states: `docs/client/DEMO-ACCOUNTS.md` (git-ignored). Staging was reseeded on 2026-10-28.
- **iOS (decision 2026-10-28, Raj):** the 3 iPhone runs dispatched on 2026-10-27 (offer, interview, quick apply) are left alone and are checked ONCE at the end of Phase 4.
  **iOS flows must be re-run before the Part 2 build; if GitHub macOS is still blocked, price the EAS cloud simulator first.**
  (EAS Workflows with Maestro need a paid Expo plan: see the note in `.eas/workflows/e2e.yml`. Free plan: 15 Android + 15 iOS builds a month, low priority queue; used in October so far: 3 iOS + 2 Android.)
- **Phase 3 status after the phone runs (2026-10-28):**
  - **Android, real phone (Realme RMX3944): all 13 flows pass** (4 new + the 9 old; flows were run one by one, with reseeds between the applicant flows).
    The phone found a real bug (new application hidden above the list after Quick Apply): fixed (`APPLICATIONS_LIST_PROPS`, `maintainVisibleContentPosition` off).
    Flow lessons are in `docs/SETUP.md` "Phone run notes" (Security test screen, Google Password Manager dialog, slow link, photo picker, reseed).
  - **iPhone: EAS iOS simulator build `5cbcc287` exists (free) and `smoke` PASSED on it** (run 40546963258). Every other macOS job waited 15 minutes for a runner and was
    cancelled (7 attempts between 16:00 and 19:12 UTC; probe `mac-probe.yml` showed `macos-15`, `macos-26`, `macos-latest` all without a machine; GitHub status clean).
    Hypothesis, not proof: US-daytime capacity. **Next:** retry at a quiet hour with the flows as separate runs (`application-offer`, `application-interview`, `apply-quick`,
    each touches different seeded data), reseed first (`npm run backend:local -- --no-start`, backend stopped), then the 9 old flows.
  - **Still to do, needs Raj:** Android preview APK build (EAS, **ask first**) and the real Sentry event from it; by-hand checks of camera photo, share sheet, CV picker.
- **Demo account for the apply flows:** `applicant@apronhanger.test` (password in `seedData.ts`): filled profile (94%), 8 applications, one per state. `candidate@apronhanger.test` has no profile on purpose ("no form CV" cases).
  Every `npm run backend:local` seed resets both (and staging shares the database).
- **Reference clone `../job` is at `f185fe0`** (= the live commit, checked read-only on 2026-10-27, D6). `../job-hotfix` unchanged.
- **Staging server exists (D24):** `apronhanger-staging-api` on Raj's own Render workspace, `https://apronhanger-staging-api.onrender.com`, free plan, dev Neon DB,
  OTP test mode. Free plan sleeps (~50 s). `app.config.ts` blocks only the live host. The `e2e-test` EAS profile points at staging (`API_URL_OVERRIDE`).
- **Repo `usecase088-creator/candidate-app` is public (D25, Raj's decision).** Never commit secrets, `.env*`, `docs/client/`, personal data or client-only material. Notes about open backend weaknesses live only in local `docs/client/`.
- **Sentry:** project `apronhanger-candidate-app` in org `rajendra-3g`; DSN in `.env.local` and the EAS variable; Sentry MCP is in the local, uncommitted `.mcp.json`.
- **Git on this laptop:** Git Credential Manager has no GitHub login; pushes use the token from `.env.local` for one command (helper in the session scratchpad, or `git -c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic <base64 x-access-token:TOKEN>" push origin main`).

## iPhone status (Phase 2: done 9/9; Phase 3 flows not run yet)

- EAS iOS simulator build `5abe96e6` (free). GitHub workflow `ios-e2e` (manual, 75-minute limit, one clean app per flow). The app starts, signs in against staging and shows the real jobs on an iPhone SE (iOS 26.2).
- **Raj said "push" on 2026-10-27; everything is pushed.** Flow fixes found on the iPhone (all in the scripts, none in the app): `hideKeyboard` is not supported (Return instead);
  Return on a password / mobile field submits the form; the "Save Password?" sheet covers messages (tap "Not Now"); the card title button hides its text (assert by `job.title.<id>`);
  `clearState` does not clear the iOS keychain (the workflow now reinstalls the app and resets the keychain before every flow); on the sign-up form the email and password fields sit behind the keyboard and the
  strong-password suggestion swallows typing (the iOS path fills email and password first with "Show" switched on, then name and mobile, then closes the number pad with "Next").
- **Result: all 9 flows pass on the iPhone simulator in ONE run (run 40495255859, 2026-10-27).** Phase 2 is fully verified on both platforms.
- Each flow run saves a screenshot and the UI hierarchy (`end-<flow>.png`, `hierarchy-<flow>.json`) in the artifact: look there first when a flow fails.
- Minutes: runs 1 and 2 were on the private repo (about 8 macOS minutes, ×10). Later runs are free (public). EAS: 1 free iOS build.

## How to run the phone flows (Android)

`npm run backend:local` (restart before each full run: it clears the test candidate's saved jobs and frees signup numbers), `npx expo start`, `adb reverse tcp:3000 tcp:3000`,
`adb reverse tcp:8081 tcp:8081`, `maestro test e2e/maestro` (about 15 min). If Metro picks 8082 because 8081 is taken, `adb reverse tcp:8081 tcp:8082`.
If the backend cannot reach the database ("Can't reach database server"): IPv6 problem, switch network (SETUP.md).

## Small things to know

- Jest prints "A worker process has failed to exit gracefully" after a few login-screen tests. All tests pass; not investigated.
- The Jest mutation cache timer (`gcTime`) is disabled in the test client (`src/test/render.tsx`), otherwise Jest never exits.
- Phase 4 TODO from Phase 2: the "Build my CV" / "Fill the form" buttons; "Apply Now" shows a placeholder until Phase 3.
- Playwright and `docs/` scratch: `*.tmp.json`, `ios-out/`, `ios[0-9]/` are git-ignored.

## Hotfix status

PR 1 and PR 2 are live on Render (live commit `f185fe0`, service `job`, branch `conflict-resolution1`, Auto-Deploy on). The list of
remaining open items (what is parked, what is untouched, and why) is kept outside this public repository in `docs/client/`
(local only): read `docs/client/ISSUES-TRIAGE.md` and `docs/client/OPEN-WEAKNESSES.md` first in a new session.

## Rules in force

- `../job` is **read-only**: never edit, commit, push, stash, checkout, reset there (a `git fetch` + `merge --ff-only` was done once with Raj's OK).
- Backend changes are made **only in `../job-hotfix`, on a branch**, only after Raj says so. **Raj merges and deploys.** Never push to `conflict-resolution1`.
- **Render:** the production service (`RENDER_API`) is GET only. The staging service in Raj's own workspace (`RENDER_STAGING_API`) may be changed by `npm run staging:deploy` when Raj asks.
- **Never use the production database URL again**, not even read-only, unless Raj says so (D22 closed). `../job/backend/.env.txt`: do not open it.
- Scope guard: build only what is in `docs/PLAN.md`; extras go to `docs/CHANGE-REQUESTS.md`; security holes found while reading go to `docs/client/ISSUES-TRIAGE.md` first.
- `docs/client/` is git-ignored on purpose: local only, never commit it. **The repo is public now: never commit client data, secrets or `.env*`.**
- Commit or push only when Raj asks. Tokens pasted in chat earlier (Expo, GitHub, Render) should be revoked by Raj.

## Open items for Raj

1. Accept Phase 3 (after the phone runs and the builds). Then Phase 4: write `docs/PHASE-4.md`, show it to Raj, build.
2. ~~Push / public repo~~ decided (D25): public, push allowed. Revisit `staging-backend/` exposure before store submission.
3. ~~Sentry DSN~~ done 2026-10-27: project `apronhanger-candidate-app` in org `rajendra-3g` (react-native). DSN is in `.env.local` and the EAS variable `EXPO_PUBLIC_SENTRY_DSN` (development, preview, production). A test event arrived (issue APRONHANGER-CANDIDATE-APP-1, no user data). Still to do: send one real app event from a build and check it for personal data (the scrubber is unit-tested). Sentry MCP is in the local `.mcp.json` (not committed).
4. **Client conversation** about the security fixes and the open question: see `docs/client/` (local only).
5. **Production on a paid always-on Render instance before store submission** (week 7). Client's cost.
6. **Read-only Neon role** if a production check is ever needed again. Separate Neon branch for staging (D4) is still open: staging shares the dev database.
7. Open decisions: see `docs/client/`; the two legacy test candidates question; CR-004 and CR-005.
