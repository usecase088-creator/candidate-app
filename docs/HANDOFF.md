# Handoff (written 2026-10-27, end of the Phase 2 session)

Read this first in a new session, then `CLAUDE.md`. Short and exact on purpose.

## Where we are

- **Phase 1 accepted. Phase 2 (Jobs) accepted by Raj on 2026-10-27 (D25); the repo stays public and pushes to `main` of this repo are fine.** Phase 3 is approved (`docs/PHASE-3.md`); Task 0 done (D26), Task 1 next. Demo account for apply flows: `applicant@apronhanger.test` (password in `seedData.ts`, 8 seeded applications); `candidate@apronhanger.test` has no profile on purpose. Summary and screen recording plan: `docs/PHASE-2-SUMMARY.md`; plan and
  checklist: `docs/PHASE-2.md`; decisions D23 (differences from the website) and D24 (staging server); change requests CR-004, CR-005.
- **Phase 2 evidence:** `npm run check` green (727 tests, coverage gates met); contract tests pass against the local backend at `f185fe0` (saved-jobs has no
  `applications` list); drift check passes (GET on production); Playwright 9/9 job specs incl. 320 px; **Maestro 9/9 on the real Android phone** and **9/9 on the iPhone simulator** (6 auth/smoke + 3 job flows each).
  The phone found one real Android bug (job header text collapsed): fixed.
- **Reference clone `../job` is at `f185fe0`** (fast-forwarded 2026-10-26, D6) = the live commit. `../job-hotfix` unchanged.
- **Staging server exists (D24):** `apronhanger-staging-api` on Raj's own Render workspace, `https://apronhanger-staging-api.onrender.com`, free plan, dev Neon DB,
  OTP test mode. Raj's other free service there (SkibidiChat) was paused on his request. Free plan sleeps (~50 s). `app.config.ts` blocks only the live host.
  The `e2e-test` EAS profile points at staging (`API_URL_OVERRIDE`).
- **Repo `usecase088-creator/candidate-app` was made public by Raj (2026-10-27)** for free GitHub runner minutes. It contains `staging-backend/` (a copy of the client's backend) and the
  docs: Raj was told; open question whether to move staging to a private repo. A scratch file `r.tmp.json` (a GitHub API response, no secrets) was committed by mistake in `0d4bad4`; removed in the next commit, still in history.

## iPhone status (done: 9/9)

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

1. ~~Accept Phase 2~~ done (D25). Phase 3: write `docs/PHASE-3.md`, show it to Raj, build.
2. ~~Push / public repo~~ decided (D25): public, push allowed. Revisit `staging-backend/` exposure before store submission.
3. ~~Sentry DSN~~ done 2026-10-27: project `apronhanger-candidate-app` in org `rajendra-3g` (react-native). DSN is in `.env.local` and the EAS variable `EXPO_PUBLIC_SENTRY_DSN` (development, preview, production). A test event arrived (issue APRONHANGER-CANDIDATE-APP-1, no user data). Still to do: send one real app event from a build and check it for personal data (the scrubber is unit-tested). Sentry MCP is in the local `.mcp.json` (not committed).
4. **Client conversation** about the security fixes and the open question: see `docs/client/` (local only).
5. **Production on a paid always-on Render instance before store submission** (week 7). Client's cost.
6. **Read-only Neon role** if a production check is ever needed again. Separate Neon branch for staging (D4) is still open: staging shares the dev database.
7. Open decisions: see `docs/client/`; the two legacy test candidates question; CR-004 and CR-005.
