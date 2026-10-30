# Stage 0 report (2026-10-31)

Ground truth for the launch, per `docs/LAUNCH-PLAYBOOK.md` Stage 0. Files written: `STORE-RULES.md` (every rule
quoted and linked), `VERSIONS.md` (what the build really contains), `BLOCKERS.md` (who must give what, by when).
Nothing outside `docs/store/` was touched; no build, test, emulator, EAS, backend or git command was run.

## Rules the app may break today (ordered by risk)

1. **Apple 5.1.1 (v), no use without login.** Every tab redirects to `/login` when signed out. The website lets guests
   browse jobs. This is the most common cause of a first-submission rejection for an app like ours. Fix = guest
   browsing (Stage 3.1); needs the client's yes (B7).
2. **No support link or contact in the app.** Apple's App Review page: "A link to user support with up-to-date
   contact information and a link to your privacy policy is required for all apps." Settings has privacy and terms
   only. Needs the client's support email/phone (B4) and a Settings entry (Stage 3.3).
3. **Privacy policy page not verified.** The app links `https://apronhanger.work/privacy-policy.html`; nobody has
   checked it exists or that it names Sentry, Expo, Cloudinary, Brevo and the retention list of
   `ACCOUNT-DELETION-DATA.md`. Required by Apple 5.1.1 (i) and Google's User Data policy (B3, B4).
4. **Account deletion depends on backend PRs 5 and 9 being live on production**, and the in-app deletion screen must
   say what is kept (Apple: "let people know what information will and won't be retained"). Google also needs the
   web page URL in the Data safety form (Stage 3.4, B5).
5. **Government-jobs disclaimer missing.** Google's Deceptive Behavior policy forbids any claimed affiliation with a
   government entity. The `gov-jobs` screen has no "not a government app" note and the listings do not exist yet
   (Stage 3.7, B6).
6. **iOS privacy manifest at app level is missing.** `ios.privacyManifests` is not set. Lottie and Hermes are on
   Apple's listed-SDK list (both ship their own manifest); Expo warns Apple does not always read manifests from static
   pods, so the app should declare the UserDefaults / FileTimestamp / SystemBootTime reasons itself (Stage 3.6). If we
   skip it, the first upload may be answered with an Apple email listing the missing reasons.
7. **16 KB page size is unproven.** Target 36 with NDK r27.1 (below the "r28 aligned by default" line). Play will
   warn, and from 1 Feb 2027 updates are blocked without it. Check every `.so` in the release build (Stage 1.7).
8. **Android 16 on large screens ignores the portrait lock** (smallest width ≥ 600 dp). Layouts must not break in
   landscape on a tablet or foldable (Stage 1.6). Edge-to-edge cannot be opted out of on target 36; we already set it.
9. **OTA updates (expo-updates on, ON_LOAD).** Allowed under Apple 2.5.2 only for fixes that do not "introduce or
   change features or functionality". Never use an update to switch on something hidden during review (2.5.19).
10. **`IOS_STORE_URL` points at the website** until the App Store id exists; a listing with a link that leads
    somewhere else is a 2.1 "fully functional URLs" risk. Replace when the app is created in App Store Connect.
11. **Sentry without a consent step.** Crash data is scrubbed and not linked to the user, but Apple 5.1.1 (ii) says
    consent is needed "even if such data is considered to be anonymous". Most apps rely on the privacy policy. Raj to
    decide (B13).

## What is already right

- Android targetSdk 36 / compileSdk 37 / minSdk 24: meets Play's 31 Aug 2026 rule. iOS deployment target 16.4 and the
  EAS Xcode 27.1 image meet Apple's "built with Xcode 26 or later" rule.
- Only camera and notification permissions; media-read, microphone, storage, biometrics and overlay are blocked
  (Play photo/video policy). System photo and file pickers (Apple 5.1.1 (iii)).
- Push is asked after the first application or from Settings, never at launch; the app works when denied.
- Account deletion in Settings with password + confirm (Apple's guidance: easy to find, confirm allowed).
- `ITSAppUsesNonExemptEncryption: false`, iPhone-only (`supportsTablet` default false), light theme locked, bundle
  id locked (D2), AAB for Play, no ads/analytics/location/contacts/payments.
- No placeholder text found in `src/`; the dev UI catalogue redirects home outside development builds; the Messages
  section does not exist (D12).

## Things that need Raj or the client

See `BLOCKERS.md` (B1 to B15). The ones that gate the next stages: B10 (Neon dev backup before Stage 1), B8 (Firebase
file if push is to be tested on the release build), B7 (guest browsing decision before Stage 3), B3/B4 (hosting and
policy text before Stage 5), B1/B2 (store accounts as organisations).

## Corrections to the playbook's source list

- The two Expo blog URLs in Stage 0 do not exist; the articles are indexed at `https://expo.dev/articles/shipping-to-the-app-stores`.
- Apple's HIG privacy/notification pages and the encryption-export and privacy-manifest documentation pages could not be
  read by our tools (JavaScript-only). `STORE-RULES.md` says which page each rule was taken from instead.
- Screenshot minimums differ between Expo's guide and the stores (Apple: at least one, medium Dynamic Island; Google:
  at least two, max eight). We follow the stores.
- Google's 16 KB page gives a date only for updates (1 Feb 2027), not for new apps.

Stopped after Stage 0, as instructed. Stage 1 waits for Raj's OK and the dev Neon backup.
