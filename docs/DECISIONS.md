# Decisions

Every big choice for the project, in plain words. Claude Code must not change these without Raj.

## D1 — Computer for building (decided)

Windows laptop, 8 GB RAM, no Mac.

- 8 GB is tight for an Android emulator + Docker + Claude Code + Chrome together. So:
  - **Main test device: a real Android phone over USB.** Uses almost no laptop RAM. Maestro works on it.
  - Android emulator only when needed, one at a time, with 2 GB RAM set in its settings.
  - **No Docker.** The local backend uses a free cloud dev database instead (D13).
- iOS can't be built or simulated on Windows. iOS checks run in Expo's cloud (EAS) and on a real iPhone
  once the client's Apple account is ready.

## D2 — Bundle ID / package name (decided 2026-10-24)

**`work.apronhanger.candidate`** for Android and iOS (Raj). Matches the live domain apronhanger.work (D5).
Variants: `work.apronhanger.candidate.dev`, `work.apronhanger.candidate.preview`.

The app's permanent ID inside the stores, like a username. Users never see it. Google calls it
"package name", Apple calls it "bundle ID". **Once the app is published it can never be changed**;
a new ID means a brand new app with zero users.

It is written as the company domain backwards plus the app name.

- (Earlier proposal `in.apronhanger.candidate` dropped: the live domain is .work.)
- Dev and test builds get `.dev` and `.preview` at the end, so they can sit on the same phone as the real app.

## D3 — OTP during testing (decided)

The backend sends real SMS through Fast2SMS and has no test mode.

- **Automated tests (Jest, Maestro, Playwright):** the local backend copy gets a local-only patch: OTP
  `123456` works for fake test numbers. No SMS is sent. Nothing changes in the job repo.
- **Manual checks of the real SMS flow:** Raj's own number. Stored only in `.env.local` as
  `TEST_MOBILE` (gitignored). Never written in code, docs, tests or commits.
  Each OTP uses the client's Fast2SMS credit, so only for a few manual checks.
- **Staging (from week 4):** the same test mode added properly to the backend, only active when
  `NODE_ENV` is not production.

## D4 — Staging backend (proposed, needed by week 4)

A copy of the backend for testing backend changes before they go live. Render free web service +
Neon free database with empty tables and test data only (no real users). Made with the project Gmail.

**Update 2026-10-26 (Raj):** staging is **never** created in the client's Render workspace. Free services share
750 instance hours per workspace, so a second free service could get the live backend suspended. Staging goes in
Raj's own Render account, later. Until then no staging service exists and `npm run staging:deploy` stays unused.

## D5 — Candidate domain for app links (decided 2026-10-24)

Live candidate website: **apronhanger.work** (Raj). Email links on this domain can open the app (Phase 4).

## D6 — Which backend commit is live (checked 2026-10-24, re-check before Phase 4)

- Render service `job` (`srv-d91b9pjsq97s73a3frsg`, **free plan**, https://job-ojsr.onrender.com), auto-deploys
  branch `conflict-resolution1`. Live deploy: commit **`35406b4`** (2026-10-04).
- Our reference clone is `3fa6885` (2026-10-08), 2 commits ahead. Those 2 commits change **website files only**;
  `backend/` is identical, so `docs/reference/API.md` matches the live backend.
- Backend work in Phase 4 branches from the live commit at that time (check again via the Render API, read-only).
- **Reference synced 2026-10-26 (start of Phase 2, Raj):** `../job` was brought from `3fa6885` to **`f185fe0`** (the live commit,
  = head of `origin/conflict-resolution1`) with `git fetch` + `git merge --ff-only` and nothing else. The only backend changes are the
  hotfix PR 1 and PR 2 (saved-jobs `applicants` instead of `applications`, no `postedBy.email` in the public job list, allow-listed
  `PUT /api/candidates/me`). Contract tests re-run against `f185fe0`.

## D7 — Account for app services (decided)

Expo is the service that builds the app files for the stores. It needs an account, and so do
Sentry (crash reports) and Firebase (Android push, Phase 4).

- **Changed 2026-10-24:** all made with the **email the client provided for this project** (not a Gmail of Raj's),
  on free tiers. Expo, Sentry, Neon (dev), Cloudinary (dev). So they already belong to the client; nothing to hand over.
- Google Play and Apple accounts stay with the client; Raj is added as a team member.
  Apple/Google organisation accounts wait for the D-U-N-S number (not done yet, 2026-10-24).
- **Store fees (agreed by phone 2026-10-24):** Google Play and Apple Developer fees are billed to and paid by
  the client.

## D8 — Expo plan (decided)

- Start on the **Free plan**. Running the app on the phone/emulator from the laptop (`npx expo run:android`)
  is free and doesn't use Expo builds at all.
- Free plan has a limited number of low-priority cloud builds per month and only a small number of
  free CI minutes for cloud test runs. It stops when used up (no surprise bill) and resets on the 1st.
- If it runs out in weeks 3–8, take **Starter ($19/month, includes $45 build credit)** for those months and cancel after.

## D9 — Expo SDK version (decided 2026-10-24)

**SDK 58** (`expo@~58.0.19`, React Native 0.88, React 19.3, TypeScript 6.0, Expo Router 58). Latest stable
at project start (SDK 58.0.0 released 2026-09-29). Node 22.13+ or 24.3+ required. Stay on it unless a store rule forces an upgrade.

## D10 — URL scheme (decided 2026-10-24)

`apronhanger://` for production — lets links open screens inside the app.
Dev and preview builds use `apronhanger-dev://` and `apronhanger-preview://`, so links open the right copy
when several are installed on one phone (same idea as the bundle ID suffixes in D2).

## D11 — Theme (decided)

Website light theme only. The app stays readable when the phone is in dark mode.

## D12 — Not in the app (decided)

Messages screen ("coming soon" on website) and admin "view as candidate".

## D13 — Local development database (decided)

A free Neon project made with the project Gmail, used only for local development and tests.
Never the production database.

## D14 — Files and emails in development (decided)

A separate free Cloudinary account (project Gmail) for dev uploads, so test files never land in the
client's real storage. Emails in dev: no real sending; Claude Code makes sure the local backend copy
doesn't crash when the email key is a dummy.

## D15 — Error text colour (decided 2026-10-25)

Small error text uses **`#D4212D`** (`oklch(0.56 0.21 25)`), slightly darker than the website's `--destructive`
`#E23439`, which is 4.4:1 on white and fails WCAG AA for small text. `#D4212D` is 5.2:1 on white and 5.0:1 on
`--background`. Same hue. Buttons, icons and borders keep `#E23439`. (Raj, THEME.md note 2.)

## D16 — Gradients (decided 2026-10-25)

`expo-linear-gradient` (Expo SDK) for the website's gradients: the signup button (`.btn-shiny-premium`) and later
the gov jobs hero. (Raj, THEME.md note 3.)

## D17 — "Edit signup details" keeps the typed values (decided 2026-10-25)

On the website, going back from the signup OTP step empties every field (uncontrolled inputs remount). The app keeps
name, mobile, email and password filled, so the user only fixes what was wrong. Everything else follows the website. (Raj)

## D18 — Say why the user was signed out (decided 2026-10-25)

The website silently sends the user to sign-in. The app's login screen says
"Your session has expired. Please sign in again." for an expired or rejected token, and shows the backend's
message for a suspended or deleted account (403). App wording. (Raj)

## D19 — Lottie animations like the website (decided 2026-10-25)

`lottie-react-native` (version picked by `npx expo install` for the SDK; native, needs a rebuild) plays the website's
own animation files from `../job/candidates/public/`, copied into `assets/lottie/`: sign-in/sign-up success,
OTP sent, password reset success. Reduce Motion: shown without playing, as the website does. (Raj)

## D20 — Only the store build talks to the live server (decided 2026-10-25)

The live Render backend is production. **Only the production (store) build uses it.** Development and preview builds
talk to the test backend (dev Neon database, OTP test mode): the local copy now, and a staging server on a separate
Render workspace (D4, `RENDER_STAGING_API`) once deployed, via `PREVIEW_API_URL`. `app.config.ts` refuses to build any
non-production variant pointed at the live server; preview/development allow plain http to the test backend on
Android, production stays https-only. The first preview APK (EAS build 7a176915, 2026-10-25) pointed at the live
server: do not install or share it. (Raj)

## D21 — Security hotfix on the live website backend (decided 2026-10-25; status 2026-10-26: PR 1 and PR 2 live, A5 parked)

Raj built the website, so security and privacy bugs in it (someone can see or change data they shouldn't) are fixed
**for free**, with his approval, before Phase 2. Bugs that expose nothing and improvements are not free: bugs are listed
for Raj to decide, improvements become paid change requests (`docs/CHANGE-REQUESTS.md`).

Rule change, only for this hotfix (see CLAUDE.md): `../job` stays read-only; the fix is made in a separate clone
`../job-hotfix`, on branch `hotfix/saved-jobs-privacy`, branched from the commit that is actually deployed on Render
(Raj gives it; if it is not the head of `conflict-resolution1`, stop and tell him). No push to the deployed branch, no
merge, no deploy, no production data, no Render API writes. Raj reviews, merges and deploys. The exception ends when Raj
confirms the hotfix is live. Which issues are fixed: those he approves from `docs/client/ISSUES-TRIAGE.md` group A. (Raj)

**Status (2026-10-26):** PR 1 (A1 saved-jobs leak, A4 recruiter email; fix `08cd1ea`, merged `5b569f1`) and PR 2 (A3 unfiltered
profile save; fix `1373342`, merged `f185fe0`) are live on Render. A5 is PARKED
until the client answers; A2 and B8 are untouched (details: local `docs/client/`). The working method (separate clone `../job-hotfix`, branch, Raj merges and
deploys) stays in force for any backend change; see CLAUDE.md and `docs/HANDOFF.md`.

## D22 — One-off read-only production DB check for the A3 abuse check (2026-10-26, Raj) — CLOSED

Exception to D13. Raj explicitly allowed using the production database URL from `../job/backend/.env.txt`
(file is git-ignored in the job repo, never copied, never printed) **read-only**, once, for the SELECT statements in
`docs/client/A3-production-checks.sql`. How: every connection runs inside `SET TRANSACTION READ ONLY`, only statements that
start with SELECT are sent, output is counts and IDs only (no names, emails, phones), the URL and credentials are never
printed or logged. Nothing else may use that URL. The exception ends when the A3 results are delivered; D13 applies again.

**Final status: CLOSED (2026-10-26).** Used twice, both times on Raj's explicit request the same day, same SELECT file, read-only
transactions, counts and IDs only (result: clean, see `docs/client/ISSUES-TRIAGE.md` status table). The production URL is never used
again, not even read-only, unless Raj says so. If a production check is ever needed again: a read-only Neon role, created by Raj.

## D23 — Phase 2 follows the website, with five deliberate differences (2026-10-26)

1. **Categories rail from real data.** The website never renders its category rail and its ids could not match real jobs (`Job.category` holds the recruiter's role type). The app builds the rail from the distinct `category` values of the loaded jobs, with "All Roles" first.
2. **Save is optimistic** (PLAN.md): the bookmark changes at once and goes back with the website's error text if the server refuses. `409 Job already saved` and `404 Saved job not found` mean the wanted state is already true, so they are not rolled back.
3. **Steppers instead of sliders** for experience (0-15) and salary (0-50, step 2): same ranges, no new native library, easier to hit on small phones.
4. **Match score on job details**: the app sends the token, so "Your profile matches {n}% ..." shows when the server has a score (the website's job page never sends the token).
5. **Failed lists show "Something went wrong" + Try Again**; the website shows an empty list. The "Build my CV" buttons wait for Phase 4; "Apply Now" says it arrives in the next update until Phase 3.

## D24 — Staging server exists (2026-10-27, Raj)

`apronhanger-staging-api` on **Raj's own Render workspace** (free plan, Singapore, `https://apronhanger-staging-api.onrender.com`), created with `npm run staging:deploy` and the staging key. Deploys `staging-backend/` from `main` of the app repo (synced to reference `f185fe0`), NODE_ENV=staging, own JWT secret, OTP test mode on, **the dev Neon database** (shared with `backend:local`; a separate Neon branch is still open). Raj paused his other free service on that workspace first (free instance hours are per workspace). `app.config.ts` now blocks only the live host (`job-ojsr.onrender.com`, apronhanger.work), so test builds may use staging. The `e2e-test` EAS profile points at staging, so the iPhone simulator run can reach a backend. The free plan sleeps (~50 s): the workflow wakes it first.

## D25 — Phase 2 accepted; repo stays public (2026-10-27, Raj)

Raj accepted Phase 2 (Android phone 9/9, iPhone simulator 9/9). `usecase088-creator/candidate-app` **stays public** (free GitHub macOS minutes) and Claude may push to `main` of this repo without asking each time.
This does not change the rules for `../job`, `../job-hotfix`, the deployed branch or Render. Because the repo is public: never commit secrets, `.env*`, `docs/client/`, personal data or client-only material.
Known exposure, accepted by Raj: `staging-backend/` (a copy of the client's backend at `f185fe0`, including the open items kept in local `docs/client/`) is public. Revisit before the store submission.

## D26 — Phase 3: permissions, confirm steps, uploads (2026-10-27, Raj)

1. **Permissions (checked on the merged files, 2026-10-27).** Only camera and photo access, with reason texts.
   - **Android release manifest** (preview variant, `processReleaseMainManifest`): `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` (offline detection), `VIBRATE` (React Native default, no prompt), `CAMERA`.
     No microphone, no storage or media read/write, no biometrics, no screen overlay. Blocked in `app.config.ts`: `RECORD_AUDIO`, `READ/WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES/VIDEO/AUDIO`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, and `SYSTEM_ALERT_WINDOW` (preview and production).
     Files and gallery pictures come from the system document picker and photo picker, which need no permission. The debug build adds `SYSTEM_ALERT_WINDOW` and `ACCESS_LOCAL_NETWORK` itself (developer menu, Metro); they are not in release builds.
   - **iOS Info.plist:** `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (wording in `app.config.ts`). No microphone text, no Face ID text (`expo-secure-store` `faceIDPermission: false`; the app uses no biometrics).
     `NSAppTransportSecurity` allows plain http only in development and preview (D20).
   - Tests in `src/lib/__tests__/appConfig.test.ts` fail if any of this changes.
2. **Confirm step** before **Decline** (interview) and **Reject Offer**: a short dialog, one tap more. The website has none; both actions are final. Deviation from the website, deliberate.
3. **Uploads with progress run through `XMLHttpRequest` inside `src/api/createApiClient.ts`** (same token, base URL, timeout and error mapping as `fetch`), so "no network calls outside the client" still holds. If MSW cannot intercept React Native's XHR under jest-expo, the transport sits behind a small interface and is faked in tests.
4. **Photo quality:** camera and gallery pictures use the picker's quality setting (about 0.7) before the 5 MB check.
5. **Part 1 demo account:** a demo candidate with a filled profile (completeness ≥ 30), seeded on the local backend and on staging. No "complete my profile" screen in Phase 3; the structured-form review step comes with the Phase 4 profile builder.
6. **iPhone:** assume the client's Apple account is not active: simulator build plus screen recording (Raj tells if that changes). Every EAS build is asked first.
