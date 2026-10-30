# Phase 4: what was built overnight (2026-10-28), for Raj to review

Everything below is **local**. Nothing is pushed, merged, deployed, built on EAS or changed on Render. No phone, emulator, Maestro run or production database was used.
App repo: 14 local commits on `main` after tag `part-1` (`git log part-1..HEAD`). Backend: 6 local branches in `../job-hotfix`, each from the live commit `f185fe0`.

## Numbers
- App: `npm run check` green: **92 suites, 1,386 tests** (was 1,180), line coverage 94%. Lint and typecheck clean.
- Backend (all six branches merged together on a scratch branch, then deleted): 182 tests pass, 2 fail. **The same 2 fail on the live commit `f185fe0`** (`paymentRoutes.verify.test.ts`, not mine). `tsc` clean, `prisma validate` ok. The branches merge into each other **without conflicts, in any order** (tried forward and reverse).
- One real-database run: account deletion against the DEV Neon database with a throwaway account: **16 of 16 checks passed**. The dev (and so staging) database now has an extra table `CloudinaryCleanup` (harmless, empty).

## App features (4B), all with loading/error/empty/offline states, testIDs, labels
| Feature | Where | Needs backend? |
| --- | --- | --- |
| Profile tab: name, photo, completeness, buttons to Edit profile, My CV, Settings, Sign out | Profile tab | no |
| Settings: privacy, terms, version, push on/off, Delete account, Sign out | `/settings` | push + delete need PR 7 / 9 |
| Profile photo: camera or gallery, remove (confirm), 5 MB check | Profile tab | no (existing avatar endpoint) |
| **Profile builder**, 16 steps, website fields, rules and wording; saved at every Next; resumes where you stopped; Review step; document vault (PDF/Word, 5 MB) | `/profile-builder` | no (existing `PUT /api/candidates/me`) |
| CV preview and **CV PDF** (made on the phone with `expo-print`, shared with the share sheet, copy deleted) | `/cv-preview` | no |
| Notifications list, read, read-all, tap to open; bell with unread count in the top bar of the tabs (D29) | `/notifications` | no (existing endpoints) |
| One link router (`src/lib/linking.ts`) for notification rows, push payloads and app links; refuses anything that is not apronhanger.work or our own schemes | | no |
| Push: asked once after the first application, or in Settings; token registered; tap opens the right screen; token removed at sign-out | | PR 7 |
| Refresh tokens: short access token renewed in the background; parallel 401s refresh once; sign-out ends the server session | | PR 8 |
| Force-update screen and feature flags (fail-open) | root layout | PR 4 |
| Delete account (password, confirm, phone signs out without calling the server) | `/delete-account` | PR 9 |
| App links config: Android intent filters and iOS associated domain, **store build only** | `app.config.ts` | needs the two `.well-known` files (`docs/store/`) |
| Sentry scrubber: push tokens, refresh tokens, `refreshToken`/`pushToken` keys | | no |
| "Build my CV" and the apply-form page now lead to the builder (Phase 3 placeholders replaced) | | no |

New native packages: **`expo-print`, `expo-notifications`** (both Expo SDK). Plus config only: notification plugin, Android `googleServicesFile` from the EAS file variable `GOOGLE_SERVICES_JSON` (optional), app links. **One EAS rebuild covers all of it.** The permission test for the manifest was extended, not loosened: `POST_NOTIFICATIONS` is allowed, everything else is unchanged.

## Backend PRs (4A) in `../job-hotfix`, all local, each with a PR body in `docs/client/PR<n>-body.md` (git-ignored)
| PR | Branch | Change | DB |
| --- | --- | --- | --- |
| 4 | `feat/app-config` | `GET /api/app-config` (min version per platform, flags, from env vars; bad input = no restriction) | none |
| 5 | `feat/delete-account-page` | static `delete-account.html` for the store listings | none |
| 6 | `feat/rate-limits` | sign-in 10/email, OTP 5/mobile, check 10/mobile, high per-IP net (100 / 40) | none |
| 7 | `feat/push-tokens` | register/remove push token, Expo push on every new in-app notification (off until `EXPO_PUSH_ENABLED=true`), receipts cron | 2 new tables |
| 8 | `feat/refresh-tokens` | rotating refresh tokens, reuse detection, logout; **only for requests with `X-Refresh-Capable: 1`**, the website is unchanged | 1 new table |
| 9 | `feat/delete-account` | `POST /api/account/delete`: user deleted, candidate emptied, applications kept but cleaned, files queued and removed from Cloudinary | 1 new queue table |
(PR 3 = A5 was **dropped** on your instruction: nothing changed, the question is in `docs/client/CLIENT-QUESTIONS.md`.)
Render does not run migrations on deploy: **the SQL for PR 7, 8, 9 must be run by you on Neon**, backup branch first (steps are in each PR body). Suggested deploy order: 4, 5, 6, then 7, 8, then 9 last.

## Decisions I took while you slept (revert any you disagree with)
D28 in `docs/DECISIONS.md` has the details. In short:
1. **A5 unchanged**, as you said. The vault follows the website.
2. **B8: the builder never sends a different phone or email.** Both come from the account and are shown read-only.
3. **The server replaces the stored document list as a whole**, so the app always sends the full list (existing + new).
4. **The picture is taken from the account record on every save**, so a new photo is never undone by an old copy inside the profile.
5. **Dates are typed as YYYY-MM-DD**, salary as two number boxes, choices as buttons (no new picker library).
6. **Refresh is opt-in by a request header**, so the live website and the Part 1 builds behave exactly as today.
7. **Deleting an account hard-deletes the User row** and anonymises the Candidate row (applications need it). Offer letters and interview history stay with the hospital.
8. ~~Notifications are reached from the Profile tab~~ replaced on 2026-10-30 by a bell in the top bar (D29).
9. **Push permission is asked once**, after the first successful application ("Not now" is remembered), or from Settings.
10. **iOS store link** is the website until the App Store id exists (`IOS_STORE_URL` in `src/lib/site.ts`). Android link is `https://play.google.com/store/apps/details?id=work.apronhanger.candidate`.
11. **Privacy URL** `https://apronhanger.work/privacy-policy.html` is assumed to be live (the sign-up screen already used it).
12. **Commits:** I committed locally in both repos (you allowed it); the tag `part-1` is local only.

## Found while reading the reference code
A few observations about how the website saves profiles, documents and phone numbers are in **local `docs/client/PHASE-4-FINDINGS.md`** (git-ignored: this repo is public). Nothing was fixed. Read that file before the next client conversation.

## Not done / not proven (be careful)
- **Nothing was tried on a phone.** Camera/gallery, share sheet, PDF printing, notifications and permission prompts only have Jest tests with the native modules faked. The three new Maestro flows (`profile-builder`, `account-delete`, `notification-open`) are **written but never run**; so are the iOS flows (HANDOFF rule: re-run before the Part 2 build).
- **Push needs setup you own:** Firebase project + `google-services.json` (EAS file variable `GOOGLE_SERVICES_JSON`) for Android; Apple account/APNs key for iPhone. Without Firebase `getExpoPushTokenAsync` fails and the app shows "Could not turn on notifications" (handled, tested).
- **App links:** the two `.well-known` files need the Play signing fingerprint and Apple Team ID (`docs/store/README.md`). Until then web links open the browser.
- **No contract tests** for the new endpoints against a real backend, and none against staging: the new routes are not deployed anywhere.
- **No EAS build, no rebuild of the APK.** The preview APK a25efbdb (Phase 3) was not touched. The next build contains all of the above.
- Phase 3 acceptance is still open (APK install, camera/share/CV picker by hand, Sentry install-check event).
- Vault: files cannot be removed once uploaded (the server ignores an empty list, same as the website). Dates have no picker (CR-006).
- Profile builder on a 320 pt screen at font scale 2.0 was **not** looked at on a device. Layout uses the same `Screen`/scroll components as other screens.
- Account deletion on the real server was never run: only the dev database run above.

## Morning checklist
1. Read this file, then `docs/PHASE-4.md` section 3 (what only you can give).
2. `git log part-1..HEAD` in `c:\dev\ah`; `git branch --list 'feat/*'` in `c:\dev\job-hotfix` (check out a branch to read its commit).
3. Decide: push `part-1` and `main`? push the six branches (I never pushed)? Then PR bodies in `docs/client/PR4..PR9-body.md`.
4. Ask the client the two questions in `docs/client/CLIENT-QUESTIONS.md` (A5, B8).
5. When Firebase/Apple/Play data arrives: one EAS rebuild (ask-first rule), then run the Maestro flows and the phone checks.
