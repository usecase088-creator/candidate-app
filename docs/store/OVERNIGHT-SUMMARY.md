# Overnight run, 2026-10-31 (02:50 to about 06:00 IST)

Raj approved an unattended run of `docs/LAUNCH-PLAYBOOK.md`. This file says what was done, what passed and failed, with
the evidence, and what Raj must look at in the morning, shortest first. Rules kept: no production database, no production
Render change, no backend merge or push, no EAS production build, no `eas submit`, nothing that costs money.

## Look at this in the morning (shortest first)

1. **Plug in the phone** (B17). `adb devices` listed no device all night, so nothing was installed or run on it. Ready to go:
   local release APK `C:\dev\ah-builds\app-release-preview-arm64-2026-10-31.apk` (preview variant → staging) and the EAS
   preview build below. Flows: `sh <scratchpad>/make-preview-flows.sh <folder>` is gone with the session; do it by hand:
   copy `e2e/maestro` and replace `work.apronhanger.candidate.dev` with `.preview` in every yaml, reseed, `maestro test <folder>`.
2. **Pick the support address** (B4): the live privacy policy says `support@apronhanger.org`, PR 5's deletion page says
   `support@apronhanger.work`. One sentence from the client settles it; then the app gets its support link (Stage 3.3).
3. **Approve two sentences** (B16): the government-jobs note and the delete-account warning, both already in the build.
4. **Decide on the extra manifest permissions** (B18): expo-notifications' badge library adds "run at startup" and launcher
   badge permissions. One-line block in `app.config.ts`, but push must be retested on the phone after it.
5. **Guest browsing** (B7): the website lets a signed-out visitor see the home feed and a job page. Apple 5.1.1 (v) will
   ask why the app does not. Yes/no from the client, then it is a Stage 3 task.
6. **Ask the client for** (B1 to B6): organisation accounts on both stores with you added, the delete-account page and a
   support page uploaded to apronhanger.work, the privacy policy extended (it names none of Sentry, Expo, Cloudinary, Brevo,
   Firebase, push, crash reports, the app, or what is kept after deletion), the always-on Render plan, approval of the
   listing drafts in `LISTING.md`.
7. **Sentry crash reporting consent** (B13): the policy sentence or an in-app opt-out.

## Stage by stage

### Stage 0: ground truth — done
`STORE-RULES.md` (every rule quoted with link and read date), `VERSIONS.md`, `STAGE-0-REPORT.md`, `BLOCKERS.md`.
Playbook corrections: the two Expo blog URLs do not exist (articles are at expo.dev/articles/shipping-to-the-app-stores);
Apple's HIG and two documentation pages render only with JavaScript and could not be read.

### Stage 1: full local test — laptop part done, phone part blocked
| Step | Result | Evidence |
| --- | --- | --- |
| 1.1 combined backend branch | already existed: `staging/phase4` in `../job-hotfix` (6 merges on `f185fe0`); `npm run backend:local -- --source ../job-hotfix/backend` added so the laptop runs it against the dev Neon DB | `scripts/backend-local.ts`, commit `61c800e` |
| 1.2 `npm run check` | green before and after the changes: 97 suites, **1,459 tests** (was 1,458) | scratchpad `check1.log`, `check2.log` |
| 1.2 contract tests | **39/39** existing + **6/6** new `tests/contract/phase4.test.ts` (app-config, refresh rotation incl. the 10 s grace window and logout, push tokens, notifications, account delete with a throwaway account on 9000000002: wrong password 400, delete, token dead, number reusable) | run at 04:1x against the local Phase 4 backend |
| 1.2 Playwright | first run: every test failed at once, Playwright's Chromium was not installed for this version (`npx playwright install chromium` fixed it, SETUP.md updated). Second run: **34/38**; the 4 failures were both auth specs × 2 projects, caused by the launch-time `GET /api/app-config` and by the real backend on :3000 answering 401 to the mocked token (the app then signs out, correctly). Spec fixed (unmocked API calls are aborted). Auth specs rerun: **8/8**. Full rerun: **37/38**; the one failure was the first test of the run, `page.goto` hitting the 60 s test timeout while Expo web was still bundling after a cold start (not the app); the same spec alone right after: 2/2. So **38/38 pass**, with one cold-start flake to know about (give the first test a longer timeout or warm the server first) | scratchpad `playwright.log`, `playwright2.log`, `playwright3.log` |
| 1.3 local **release** build | `expo prebuild` (preview variant) + `gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a`: **BUILD SUCCESSFUL in 53 min** (first native build, CMake 3.31.6). APK 41 MB, copied to `C:\dev\ah-builds\`. **Not installed** (no phone) | scratchpad `gradle-release.log` |
| 1.4 Maestro on the phone | **not run** (no phone) | |
| 1.5 reviewer/user scenarios | **not run** (no phone) | |
| 1.6 Android 16 checks | **not run** (no phone); config facts: edge-to-edge on, predictive back opted out (`enableOnBackInvokedCallback="false"` in the merged manifest), target 36 | `VERSIONS.md` |
| 1.7 16 KB page size | **pass** on the release APK: `zipalign -c -P 16 -v 4` "Verification successful"; ELF `PT_LOAD` alignment of all 32 arm64 libraries ≥ 16 KB, 0 unaligned | `VERSIONS.md` |
| 1.8 by-hand checklist | written: `BY-HAND-CHECKLIST.md` | |

Merged release manifest (preview variant): runtime permissions only `CAMERA` and `POST_NOTIFICATIONS`; none of the blocked
media/storage/microphone/biometric/overlay permissions; extra normal permissions from expo-notifications and Firebase (B18).

### Stage 2: smoothness — not started (every measurement needs the release build on the phone)

### Stage 3: store hardening — done where no decision was needed
- 3.1 guest browsing: blocked (B7), website behaviour documented.
- 3.2 placeholders: none found in `src/` (grep for coming soon / lorem / TODO / placeholder / next update); the dev UI catalogue redirects home outside development builds; no Messages section.
- 3.3 privacy/terms/support links: privacy and terms are in Settings and on sign-up and both URLs are live (checked with curl: 200, real pages); **support link blocked** (B4).
- 3.4 account deletion: in-app screen + PR 9 verified by the new contract test on the local backend; the warning now names what the hospitals keep (test first, `DeleteAccountScreen.test.tsx`). The web page `delete-account.html` is **not uploaded yet** (the URL returns the website's index page, B3).
- 3.5 permissions: merged release manifest shown above and in `VERSIONS.md`; B18 for the extras.
- 3.6 app config: target 36 / compile 37 / min 24 / iOS 16.4 / Xcode 27.1 image; `usesNonExemptEncryption: false`; iPhone-only; **iOS privacy manifest added** (`ios.privacyManifests`, test in `appConfig.test.ts`); icons, splash, name, version 1.0.0 present; build numbers come from EAS (remote, auto-increment).
- 3.7 government jobs: note added to the screen (test first, `ListingScreens.test.tsx`), wording in B16; listing text carries the same sentence.
- 3.8 push: asked after the first application or from Settings; works when denied (unchanged, code read).
- 3.9 OTA: expo-updates on for preview/production, `ON_LOAD`; rule recorded in `STORE-RULES.md` (JavaScript fixes only).

### Stage 4: store pack — drafts written, waiting for approval and for the traffic capture
`DATA-INVENTORY.md` (from code; **traffic capture of the release build still to do** on the phone), `DATA-SAFETY-GOOGLE.md`,
`APP-PRIVACY-APPLE.md`, `RATINGS.md`, `LISTING.md`, `SCREENSHOTS.md`, `DEMO-ACCOUNT.md`, `REVIEW-NOTES.md`.

### Stages 5 and 6 — blocked on the store accounts (B1, B2) and the production backend plan (B5)

## Builds used
- Local release APK (no EAS): `C:\dev\ah-builds\app-release-preview-arm64-2026-10-31.apk`, commit `61c800e` + prebuild of the preview variant, arm64 only, debug keystore (local test only).
- **EAS preview build 1 of 3:** `ae4de91f-e04a-499f-8c94-33d227f38ab8`, profile `preview` (→ staging, Firebase file set), commit `61c800e`, started 05:15 IST. Result: **FINISHED** (05:51 IST). APK: https://expo.dev/artifacts/eas/IX9PY1_GX-r6eLXt0y0MRmCx1QqQ7W5al_LhDG35AHc.apk (link expires 2026-11-13). Install it as "ApronHanger (Preview)" next to the Phase 3 one; it replaces `a25efbdb`. Not installed or run anywhere yet. Logs: https://expo.dev/accounts/apronhanger-candidate/projects/apronhanger-candidate/builds/ae4de91f-e04a-499f-8c94-33d227f38ab8
- No other EAS build, no workflow run.

## Commits (main)
- `61c800e feat(store): launch hardening that needs no decision (playbook Stage 1 and 3)`
- `fbf3b4f docs(store): launch playbook Stage 0 ground truth and Stage 4 store-pack drafts`
- the summary commit after these. Pushed to `origin/main` at the end of the run (see git log). `.mcp.json` (local Sentry MCP) left uncommitted on purpose.

## Small things seen
- Expo web (Playwright) shows a dev LogBox entry "this.validatePath is not a function" after sign-in; it comes from Expo Router's web path config (`expo-router/build/fork/validatePathConfig`), not from our code; web only, no effect on the native app. Not investigated further.
- The local backend from `staging/phase4` reports the dev database "already in sync" (PR 7/8/9 tables exist from the staging work).
- Processes started overnight (local backend on :3000, Expo web for Playwright, Gradle daemon) were stopped at the end of the run.
