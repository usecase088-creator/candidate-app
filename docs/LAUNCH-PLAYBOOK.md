# ApronHanger Candidate App — Launch Playbook

Put this file at `docs/LAUNCH-PLAYBOOK.md`. Claude Code reads it at the start of every launch session.

Goal: approved on Google Play and the App Store on the first submission, and smooth enough that users
compare it with Swiggy or Zomato, not with a website.

Work in stages. **Stop after every stage, report, and wait for Raj's OK.**
All rules in `CLAUDE.md` still apply: no production database, no Render changes, no EAS build, EAS submit
or store upload without Raj's OK. Never invent a store rule: every rule you rely on must be quoted from
the current official page, with the link.

---

## Stage 0 — Ground truth (read before touching code)

1. Read the current official sources yourself, not blog summaries:
   - Apple: App Store Review Guidelines, the App Review page (common issues), App Store Connect Help
     (screenshot specifications, age ratings, App Privacy details, account deletion guidance,
     export compliance), Human Interface Guidelines for anything you change in the UI.
   - Google: Play Developer Policy Center (User Data, Account Deletion, Photo and Video Permissions,
     Misleading Claims / government information), Play Console Help (Data safety form, target API
     level requirements, app access, content rating, target audience, testing tracks, review times),
     Android 16 behavior changes, Android vitals.
   - Expo: the docs for our exact SDK version (build, submit, app config, privacy manifests, updates),
     and the articles "How to submit an app to the App Store and Google Play" and "Why apps get
     rejected from the App Store and how to avoid it".
2. Write `docs/store/STORE-RULES.md`: each rule that applies to this app, quoted, linked, with the date
   you read it. Where sources disagree (for example required screenshot sizes), say so and use the
   official Apple or Google page.
3. Record our real versions: Expo SDK, React Native, Android compileSdk/targetSdk/minSdk, iOS
   deployment target, and every native library with its version.
4. Report: rules that our app may currently break, and anything that needs Raj or the client.

## Stage 1 — Full local test (laptop first, then Raj's USB phone)

1. In `../job-hotfix`, make a local combined branch of the 6 backend PRs. Point `backend:local` at it,
   using the dev Neon database. Raj makes a Neon backup branch of dev first: wait for "backup done".
2. Laptop: `npm run check`, contract tests against the local backend, Playwright on Chromium.
   Fix failures, tests first.
3. Build a local **release** Android build (no EAS) and install it on Raj's phone. Judge everything on
   the release build only; debug builds are slower and hide release-only crashes.
4. Run every Maestro flow on the phone, including profile-builder, account-delete and
   notification-open, until all pass.
5. Test what reviewers and real users hit and teams usually miss:
   - fresh install with no data; sign up, sign out, sign in again
   - stored token expired or invalid on app start: the app must recover to login, never a blank screen
   - kill the app mid-flow (profile builder, upload) and reopen
   - an empty account sees useful empty states with a clear next action
   - a failing server shows an error with Retry, never an empty list that looks like "no data"
   - airplane mode mid-action, slow 3G, backend asleep (cold start)
6. Android 16 checks (our target SDK):
   - edge-to-edge on every screen: nothing hidden under the status bar, navigation bar or keyboard
   - system back gesture and predictive back on every screen, including modals, the profile builder
     and the date picker
   - a large-screen emulator (tablet or foldable, 600 dp and wider): portrait lock is ignored there,
     so layouts must not stretch or break in landscape
7. Check every native library in the release build for 16 KB page-size alignment. Report failures.
8. Give Raj a by-hand checklist for what Maestro can't prove: camera, photo picker, CV PDF and share
   sheet, offer letter download, date picker, push permission and a real push (once Firebase is ready),
   an email link opening the app, delete account, the bell at 320 pt width and font scale 2,
   dark mode on, TalkBack on the main flow.

## Stage 2 — Make it smooth (measure first, fix second)

Lag in React Native is almost always the JavaScript thread being blocked. Prove it before fixing it.

1. On the release build on Raj's phone, measure and report before changing anything:
   - cold start to first jobs visible
   - tap on a job to details fully shown
   - home feed scroll: dropped frames (use the in-app frame-rate monitor or a profiling tool)
   - opening the profile builder and moving between steps
   - re-renders per action (React DevTools render highlighting)
2. Check the backend side from India: which regions Render and Neon run in, response times of the main
   endpoints, and how many calls each screen waits on one after another. Report.
3. Fix only what the numbers justify, biggest win first:
   - React Compiler, if supported by our SDK (check the Expo docs for our version)
   - TanStack Query: sensible staleTime per query, keep previous data while refetching, save the cache
     to disk so the app opens with data, prefetch job details when a row is pressed or visible
   - skeletons that match the final layout instead of full-screen spinners; optimistic updates where safe
   - lists: best practice for the installed FlashList version, memoized rows, stable keys, no heavy work
     in render
   - animations, sticky headers and press feedback on the UI thread (Reanimated); Android ripple;
     light haptics on key actions (expo-haptics)
   - expo-image with fixed sizes, caching and placeholders
   - startup: defer non-critical setup, lazy-load the profile builder, keep root imports small
   - forms: smooth keyboard behaviour, no layout jumps
4. Ask Raj before adding any library outside the Expo SDK. Re-measure and show before/after numbers.
5. Targets to aim for on a mid-range Android phone: no visible stutter while scrolling, taps respond
   instantly, cold start a few seconds at most. In production, stay well below Google Play's Android
   vitals bad-behaviour thresholds for user-perceived crash rate and ANR rate.

## Stage 3 — Store hardening (make the fixes, tests first)

Plan each item, show Raj the plan, then build.

1. **Guest browsing** (Apple 5.1.1(v)): first check what the website lets guests do. Plan guest access
   to home, search, job details, government and international jobs; ask for login only for apply,
   save, applications, notifications and profile. Account deletion stays required (Google requires it
   even when some features work without an account).
2. **No placeholder anywhere** (Apple 2.1): search the app for "coming soon", "lorem", "test",
   "TODO", empty screens, dead buttons, broken links. The Messages section must not appear at all.
3. **Privacy and support links inside the app**: privacy policy, terms and support in Settings, and on
   the signup screen. Pages must open signed out, on a phone, as plain static pages on
   apronhanger.work (needs hosting access; list it as a blocker if missing).
4. **Account deletion end to end**: in the app (Settings) and the web page, deleting on the server,
   with the message about what is kept matching `docs/store/ACCOUNT-DELETION-DATA.md`.
5. **Permissions**: show the final merged AndroidManifest and Info.plist. Only camera and the system
   photo picker; no READ_MEDIA_IMAGES or READ_MEDIA_VIDEO, no microphone, no location, no contacts.
   Each permission is asked at the moment of use, with a purpose text that names the feature.
6. **App config**:
   - Android target SDK meets Play's current requirement; Android App Bundle for upload
   - iOS built with the Xcode/SDK Apple currently requires (EAS image)
   - `usesNonExemptEncryption: false` (we only use HTTPS)
   - iPhone-only unless we fully test iPad; Apple can still open an iPhone app on an iPad
   - iOS privacy manifest covers our code and every SDK that needs one
   - icons, adaptive icon, splash, app name, version and build numbers
7. **Government jobs**: a clear "not a government app, not affiliated with any government body" note
   in the app and the listing, with links to the official sources.
8. **Push**: ask permission only after a useful action, never on first launch; the app works fully if
   it is denied.
9. **Over-the-air updates**: allowed only for JavaScript fixes within Apple guideline 2.5.2; never to
   switch on features hidden during review.

## Stage 4 — Store pack (drafts for Raj and the client to approve)

Write everything in `docs/store/`:

1. **Data inventory first**: every piece of data that leaves the phone, which service gets it
   (our backend, Cloudinary, Sentry, Expo push, Firebase), and why. Check the real network traffic
   of the release build, not just the code.
2. From that inventory: Google Data safety answers (including the data deletion questions and the web
   deletion URL), and Apple App Privacy answers (including crash data from Sentry). Answer each store's
   form on its own terms; don't copy across.
3. Apple age rating answers (the current questionnaire) and the Google content rating questionnaire.
   Target audience: adults (18+). Declarations: no ads, not a government app, no financial features,
   no health features.
4. Listing drafts for both stores: name, subtitle, short and full description, keywords, category,
   support URL, marketing URL, copyright line. Describe only what the build does today.
5. Screenshot plan from the real release build, showing the app in use (job feed, job details, apply,
   applications, profile), not the login screen. Use the sizes on Apple's and Google's official spec
   pages on the day we upload. Google feature graphic.
6. **Reviewer demo account plan** on production:
   - a realistic demo hospital and jobs
   - the demo candidate's applications in every state: applied, interview, document request, offer
   - those jobs closed afterwards so real candidates never see them
   - the account must still show content after the jobs are closed (check this)
7. **Review notes** for both stores: what the app does, the demo login, "sign-up needs an Indian
   mobile number for OTP, so please use the demo account", where each feature is, the
   government-jobs disclaimer. No hidden features and no review-only mode (Apple 2.3.1).

## Stage 5 — Rehearsal before submission

1. With Raj's OK: production builds (AAB and IPA) on EAS. Record the commit and build number of each.
2. Android: upload to the internal testing track; read the pre-launch report; fix anything it finds.
3. iOS: TestFlight on a real iPhone (no Mac here, so this is our only real iPhone test). Run the main
   flows and the by-hand checklist on it.
4. **Fresh-eyes rehearsal**: someone who did not build the app (the client is ideal) gets only the
   store build, the review notes and the demo account. Watch where they get stuck; fix the app or the
   notes.
5. Go / no-go checklist, every line must be "yes":
   - production backend on an always-on plan, all 6 backend PRs live, SMS balance OK, Sentry on
   - privacy, terms, support and delete-account pages live
   - demo account works from a clean install on both platforms
   - no crashes in Sentry from the rehearsal
   - forms (data safety, App Privacy, age rating, content rating, declarations) filled and approved
   - listings and screenshots approved by the client

## Stage 6 — Submit, release, watch

1. Submit Android first: Google can take up to about 7 days for a new app. Then iOS.
2. iOS: choose manual release, so both stores can go live on the same day. Android: staged rollout.
3. Do not change the backend or the demo account while a review is open. Keep the reviewed build's
   commit and logs.
4. If rejected: reproduce exactly what the reviewer did, on the submitted build, with the demo account.
   Decide whether the fix is metadata only or needs a new build. Reply in App Store Connect or Play
   Console with what failed, what changed and how to see it. Appeal only if the reviewer misunderstood
   the app.
5. Expedited review (Apple) only for a real critical bug in a live version or a real dated event.
   Never claim a bug that doesn't exist.
6. After launch: watch Sentry and Android vitals daily for the first two weeks; halt the rollout if
   crashes rise.

---

## Blockers that need Raj or the client

Keep this list updated in `docs/store/BLOCKERS.md`, with who and by when:

- Client: Apple Developer account (organization, D-U-N-S), Raj added as Admin
- Client: Google Play verification finished, Raj added
- Client: hosting access, or someone to upload the privacy, terms, support and delete-account pages
- Client: final privacy policy text and support email and phone
- Client: always-on backend plan before submission
- Client: approval of listings, screenshots and the government-jobs disclaimer
- Raj: Firebase project for Android push
- Raj: Neon backup branches before any database step
