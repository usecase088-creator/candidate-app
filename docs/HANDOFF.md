# Handoff (updated 2026-11-23: website parity round, CV PDF fix; iPhone run on the parity build)

Read this first in a new session, then `CLAUDE.md`. Short and exact on purpose.

## Where we are

- **2026-11-23 night (website parity, Raj asleep: "compare our app with the website ... make the necessary things as
  website ... don't wait for my instruction"):** the CV PDF was empty on Android (unawaited `File.move`, async since SDK 58,
  and the file deleted as soon as the share sheet returned; the offer letter had the same delete). Fixed and confirmed by
  Raj on the phone; lint now has `no-floating-promises` + `await-thenable` on src. Three read-only audits compared every
  screen with the website; the fixes, all test-first: the CV PDF and preview follow the website CvDocument (gradient
  header, Doctor CV badge, credentials, two columns, research boxes, key procedures); Home join/Build CV banner;
  reset-password rules and messages; login gated subtitle, trust line, sign-up "Sign in here"; header titles "Government
  jobs & exams" / "International healthcare jobs"; Intl "Open"; guest save toast; interview "Date:"/"Type:"; apply
  409/413 sentences; upload form required marks; notifications empty text; the Profile tab shows the website sections
  with Edit to the right builder step, hero details and stats; builder: opens the CV preview after saving, a failed
  document upload still saves (website), saved documents open, picked files removable (saved ones stay, the server keeps
  them), Optional Section badge, salary ranges with the 0-120 cap, review lines; Settings Legal & Policies (About, Code of
  Conduct, Privacy, Terms & Conditions); **apply with the structured form** like the website wizard (D27 item 9
  superseded). New Maestro flows `apply-form`, `profile-photo-sheet`; the tour has the form apply page and profile
  sections. `npm run check`: 134 suites / 2,024 tests. The audit items left that night were done on 2026-11-23 (Raj: "go
  ahead with the remaining website features"): builder readiness panel + step list (card at the top of each step) and
  mini CV preview on Review (website computeDoctorReadiness / CvMiniPreview); website chip suggestions; Profile strength
  8-item checklist ("x of 8 complete", a missing item opens its builder step, "Complete profile"); filter insight tiles
  (Roles / Top LPA / Best fit) in the sheet and removable active-filter chips with Clear all on Search. `npm run check`:
  137 suites / 2,068 tests. Flows: Profile rows are reached by scrolling to Sign out first (Maestro never counts a row
  clipped by the tab bar as visible). To check once: on the Android login screen after a session expiry the password box
  showed dots with an empty email (the form starts empty; most likely Google autofill). The GitHub credential in Git Credential Manager expired overnight: pushes used the repo token from `.env.local`
  for the command only; Raj should sign in to GCM again.
  **iPhone (EAS sim build f1c00b62, commit d6e6b7a): all 20 flows + the tour pass** (first run 15/20: Profile rows below
  the new sections, a seeded experience without the now-required specialty, a late "Save Password?" sheet; flows fixed
  in 226faa0, re-run green). **New preview APK `b4ca7229` (commit 1d48856, staging backend, all fixes above):**
  https://expo.dev/artifacts/eas/kBrbDFFPUvOS_tojNKdJfGLF0JX4YOUhd7D5-uBxsrc.apk (uninstall the old preview app first).
  Not yet run on the Android phone (not connected): install, reseed, run `e2e/maestro` + the tour.

- **2026-11-22 night (client build):** Raj approved the iOS filters page sheet, the destructive red #C81E2A (both in
  DECISIONS D32) and a new preview build. EAS preview APK `77a60c50` (commit 430dd14, staging backend):
  https://expo.dev/artifacts/eas/YqaT-LkM3DOySHAZGcnDNCAQHZuWpRKtqmaAyJpREMA.apk (copy `C:\dev\ah-builds\preview-d32.apk`).
  The first try failed in "Configure expo-updates": the build command needs `GOOGLE_SERVICES_JSON` set locally
  (docs/SETUP.md). Installed on Raj's phone, the process starts (phone was locked, UI not seen). The client must uninstall
  the old preview app first.

- **2026-11-22 evening (iPhone verification):** EAS e2e-test build `621de877` (commit dab1632) on the GitHub `ios-e2e`
  simulator (375x667): **all 17 Maestro flows and the visual tour pass** (run 45009995636 + rerun 45015924872 for
  jobs-search-filters). Fixed on the way: iOS filters are now the system page sheet (`presentation: 'modal'`; the
  react-native-screens formSheet broke the header + scroll + footer layout), iPhone flows close the keyboard with Enter
  and go back with the edge swipe (`_common/goBack.yaml`), the salary stepper is centred before tapping (the sticky
  footer covered it on the small screen), the tour opened the wrong applications and tapped the photo badge (hidden from accessibility; it now taps the avatar). The
  requested-documents list showed an icon and a text bullet per item (the bullet is gone; the website uses an `<li>`). The workflow now keeps the tour
  screenshots (`output/tour/`); the 26 iPhone screens were reviewed by eye, no layout bug found. Final iPhone build `6fc7cc47`
  (commit ade292c): all 17 flows + tour pass; new flow `profile-photo-sheet` passes too. **Android (Raj's phone, APK
  rebuilt from the same code):** all 18 flows and the tour pass; the run found that Maestro's Android hideKeyboard
  presses Back when no keyboard is open (it left the sign-up form and the interview screen: removed there) and that a
  Google "Save password" sheet can outlive a flow (openSignIn closes it with Back). Nice-to-have: the saved bookmark on
  Android is the Material outline "bookmark_added", not a filled bookmark like iOS (expo-symbols draws outlines). **Raj to decide:** iOS filters as a page sheet;
  destructive red #C81E2A in DECISIONS.md D32; a new EAS preview build for the client.

- **2026-11-22 day (D32 verification, Raj asked for review agents + pixel checks + an iPhone build):** a code review
  (R3, 15 findings) and an accessibility/large-text audit (P1: errors and toasts were never spoken) were fixed in one
  pass: announce() for errors/toasts, contrast tokens (placeholder #636D7F, brandText #2A5BC4, controlBorder #8A94A6,
  destructive #C81E2A instead of the website #E23439: AA exception, **needs Raj's OK to record in DECISIONS.md D32**),
  48-pt touch targets, radio groups, keyboard offset under native headers, platform files for ripple/haptics. On the
  phone (local release APK, dev variant on staging, `C:\dev\ah-builds\d32-dev-staging-arm64.apk`): **all 17 Maestro
  flows pass**; the device found and we fixed: the empty band under every native header (double top inset), the
  filters sheet footer off screen on Android (now one full detent; iOS keeps 0.7/1), the retry on Delete account
  appending to the rejected password (now cleared after 400/401), flows that pressed Back after the OTP auto-submit,
  sign-in tab labels shrinking at font scale 2, stats labels breaking mid-word. The visual tour (`e2e/tour/visual-tour.yaml`)
  passes at normal size and at 320 dp / font scale 2 (26 screens each). `npm run check`: 133 suites / 1,950 tests.
  iPhone: EAS e2e-test build `4215e931` (commit 784e191) and an `ios-e2e` run with the tour + all flows dispatched.

- **2026-11-22 overnight (D32 continued, Raj asleep, asked to finish without waiting):** every screen is redesigned
  (job details + apply, applications, profile/settings/notifications, auth), then an independent review scored the result
  (6.2/10, 20 issues) and a polish round fixed them: navy hero band on Home, visible tonal fill token, centred empty-state
  actions, one red required star (FieldLabel), inset JobRow separators, bookmark pop, panel colour by need, status said
  once, animated SVG match ring, photo bottom sheet, one card style, settings groups, filters captions, own empty-state
  icons. **Checks:** `npm run check` 128 suites / 1,864 tests green (Jest now capped at 2 workers: the full run timed out
  screen tests under load); Playwright web specs 38/38 after fixing stale specs (signIn helper, native header back);
  visual tours at 390 and 320 pt reviewed by eye. **Device:** a local release APK of the dev variant pointed at staging
  (`work.apronhanger.candidate.dev`, installs next to the preview app) is installed on Raj's phone and copied to
  `C:\dev\ah-builds\d32-dev-staging-arm64.apk`, but the phone was PIN-locked all night, so **no screen was checked on the
  device and no Maestro flow ran**. The cloud iOS build (EAS e2e-test) was refused by the permission classifier; not
  retried. **Morning steps:** unlock the phone; reseed staging
  (`npm run backend:local -- --no-start --source ../job-hotfix/backend`, IPv4 fallback `scripts/demo/reseed-ipv4.cjs`);
  `maestro test e2e/maestro` (flows already use `.dev`); check 320 dp / font scale 2; then a new EAS preview build for the
  client (needs Raj's OK). Maestro flows changed for the native header (system back / edge swipe) and OTP auto-submit:
  they are not yet proven on a device.

- **2026-11-21 (D32 UI redesign, Raj in the session):** the client tried the Android preview build and said the flows work but
  the app is not premium (spacing, oversized text). Six frame-by-frame audits + a code inventory (local scratchpad) led to
  `docs/design/UI-REDESIGN.md` (the system, the screen plan, the order of work) and D32 (Raj approved native headers,
  expo-haptics, react-native-svg, sentence case, status colour by need). **Done so far (all test-first, `npm run check` green,
  120 suites / 1,746 tests):** type ramp with per-variant font-scale caps, one radius family, new tokens; `PressableScale`
  (Reanimated press + ripple + haptics), Button sizes/variants/loading/disabled (+ the `fullWidth={false}` bug that stretched
  11 ghost "Back" buttons); native stack headers on every pushed route (tabs anchored for deep links) and a 44-pt TopBar
  with the tab title; new primitives (ListRow/ListGroup/SectionHeader/Separator, Pill, LogoTile/Avatar, SearchField,
  StickyActionBar, Panel, Chip/Checkbox/Stepper/TextInput/OtpInput/TextButton upgrades, animated Toast, shimmer Skeleton +
  presets, EmptyState/ErrorState with icon); JobRow replaces JobCard; Home (compact hero, tiles, edge-to-edge rail),
  Search (compact fields, Filters button, chip) with `/filters` as a form-sheet route; Gov/Intl as rows with stats strip and
  pills; Expo template colours replaced. Maestro `jobs-gov-intl.yaml` updated (system back, header titles). **In progress:**
  job details + apply, applications, profile/settings/notifications, auth (agents, same rules). **Not yet done:** on-device
  check (Android phone at 320 dp / font scale 2, iPhone SE via `ios-e2e` needs a NEW e2e-test build: ask Raj, EAS minutes),
  `e2e/demo` regeneration (`python scripts/demo/build-demo-flows.py`), a new preview build (ask Raj), the client's install
  problem ("The app wasn't installed": uninstall the old preview app first; 112 MB APK link valid to 2026-12-01).
  Typed routes: `.expo/types/router.d.ts` was patched by hand for `/filters`; `npx expo start` regenerates it.

- **2026-11-01 (Raj in the session, phone connected):** on the overnight preview build (`ae4de91f`) all 16 Maestro flows passed (2 flow scripts
  fixed, `05253cf`) and the real push test found a launch-blocker, fixed and confirmed on build `1c1ad1f7`:
  Android 13+ reports "denied" before the app has asked, so push was never offered (and staging's push switch had not been applied:
  re-run `npm run staging:deploy`, then a recruiter *rejection* or interview invite sends a push; "Applied to Reviewed" sends none).
  Also done, all in D30 / CR-013: **guest browsing** (a signed-out visitor sees Home, Search and job details; save, apply, filters and
  the account tabs ask to sign in and return; an independent review found 4 issues, all fixed), the badge/boot permissions blocked
  (APK 31 to 10 permissions, B18 closed), large-text fixes (icons drawn as text clipped; tab bar too short; Applications label;
  guest Sign in button), the client documents (`docs/client/send/` and `docs/client/WHATSAPP-MESSAGE.txt`, git-ignored).
  **Build 4 `d91e342f` (everything above) is tested on the phone:** all 17 Maestro flows pass (incl. the new `guest-browse.yaml`;
  copy of `e2e/maestro` with appId `.preview`, see SETUP.md), tab labels, icons, bell and the guest Sign in button fit at 320 dp /
  font scale 2, and a real push arrives when notifications are already allowed at sign-in. Jest 1,524 / 101 suites and web specs
  10/10 pass (Playwright needs port 8081 free; stop any `expo start` first and run with `--workers=1` on this laptop).
  Stage 2 smoothness is measured and needs no fix (`docs/store/STAGE-2-REPORT.md`). **iPhone simulator (build `dd1840c4`, 2026-11-03/04): all 17 flows pass** (each passed on this build; gathered over several `ios-e2e` runs,
  not one full batch: the workflow does not reseed, so data-changing flows were run in small batches after a staging reseed). Covers guest
  browsing, sign-in/out, delete account, profile builder, applying, interview, offer, search, filters and the gov list. The first runs failed
  on iPhone-only or small-screen script problems, not app bugs (iPhone SE 750x1334 vs the tall Android phone: taps below the fold hit the
  tab bar, `assertVisible` does not scroll, the iOS "Save Password?" sheet can open late, Return does not close a multi-line field).
  Flows were fixed (`_common/iosPasswordSheet.yaml`, scroll before tap, drag the page above the keyboard) and re-proved on Android.
  To re-run: reseed staging (`npm run backend:local -- --no-start --source ../job-hotfix/backend`), then
  `POST /repos/usecase088-creator/candidate-app/actions/workflows/ios-e2e.yml/dispatches` with
  `{"ref":"main","inputs":{"build_id":"dd1840c4-a7fc-44a2-9b1e-c763adaa0147","flows":"e2e/maestro/<flow>.yaml"}}` (token in `.env.local`;
  GitHub's macOS runners are often unavailable: expect to retry). Not yet tested on a real iPhone: that comes with TestFlight. Still with Raj or the client: B1 to B6
  (sent as one short message plus one Word document), B13 (Sentry consent).

- **2026-10-31 overnight (Raj approved an unattended run of `docs/LAUNCH-PLAYBOOK.md`):** read `docs/store/OVERNIGHT-SUMMARY.md` first,
  then `docs/store/BLOCKERS.md` (what only Raj / the client can give) and `docs/store/STAGE-0-REPORT.md`.
  Done: Stage 0 (rules quoted in `docs/store/STORE-RULES.md`, versions in `VERSIONS.md`); Stage 1 on the laptop (local backend
  from the combined branch `staging/phase4` via `npm run backend:local -- --source ../job-hotfix/backend`, 39 + 6 contract tests incl.
  a new `tests/contract/phase4.test.ts`, Playwright 38/38 after fixing the auth specs, local **release** APK built and checked for
  16 KB alignment and permissions); Stage 3 items that need no decision (government-jobs note, deletion wording, iOS privacy manifest);
  Stage 4 drafts in `docs/store/` (data inventory, Data safety, App Privacy, ratings, listing, screenshots, demo account, review notes).
  **Not done: anything on the phone** (`adb devices` showed no device all night), Stage 2 measurements, guest browsing, support link,
  Stages 5 and 6 (store accounts). EAS preview build: see the summary for the build id.

- **2026-10-30 session (Raj's answers to the Phase 4 review):**
  - Built (tests first, `npm run check` green, 95 suites / 1,428 tests): bell + unread count in a top bar (D29.1), profile drafts on the phone until the last step with retry-safe final save (D29.3), native date picker `@react-native-community/datetimepicker` 9.2.1 (D29.4, new native module: needs the next EAS build), flaky job-details test fixed, store ID locked (D2), `docs/store/ACCOUNT-DELETION-DATA.md`.
  - Backend PR 9 got a second commit `a95ba54` (recruiter notifications renamed to "Deleted candidate", pending OTP/reset requests deleted). **Not run against a real database.**
  - **Pushed: the 6 backend `feat/*` branches** to `apronhanger/job` (via Git Credential Manager, user `rajendra0000`; the `GITHUB_TOKEN` in `.env.local` has no access to that repo). `conflict-resolution1` untouched (`f185fe0`, still live).
  - **Pushed on 2026-10-30 (Raj: "push it, let it be public for now"): app `main` (`0661070`) and tag `part-1`.** The repo stays public for now.
  - **Deploy plan (Raj):** all 6 PRs to STAGING first, phone test against staging, then production one PR at a time, a Neon backup branch before every PR with SQL (7, 8, 9). **STAGING DONE 2026-10-31:** staging runs live `f185fe0` + all 6 PRs (local branch `staging/phase4` in `../job-hotfix`, synced with `npm run staging:sync -- --source ../job-hotfix/backend`, app commit `65a17e4`; the client backend code is now public in `staging-backend/`, Raj chose this). PR 7 and PR 8 SQL ran on the dev DB through `migrate deploy`; PR 9's migration was only marked applied (its table already existed, identical, from the 2026-10-28 test). 15/15 API checks passed on staging, including a real account deletion (recruiter notification renamed, number reusable). 9000000003 was used and deleted; 9000000001 hit the OTP limit (in memory, 15 min). **Next: preview EAS build (ask Raj first), then Raj's phone test.**
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
