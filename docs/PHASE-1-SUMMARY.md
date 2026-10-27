# ApronHanger candidate app: Phase 1 summary

**Phase:** 1 of 5, "Foundation and login" · **Dates:** 24–25 October 2026 (planned: one week) · **Status:** complete,
waiting for acceptance · **Prepared for:** Raj and the ApronHanger client

---

## 1. In one minute

Phase 1 built the foundation of the candidate mobile app and the first real feature set on top of it: **a candidate can
sign up with a mobile-number OTP, sign in, reset a forgotten password, stay signed in after closing the app, and sign
out.** It behaves like the existing website, with the same wording, rules and messages, and it talks to the same backend
and database.

It runs on a **real Android phone** (tested), and the **iPhone version builds and runs** (tested on an iPhone simulator).
Nothing has been published to the Play Store or App Store yet; that is planned for later phases.

**Nothing was spent.** Every account and service used so far is on a free tier.

| | |
| --- | --- |
| Screens built | Sign in · Create account (details, then OTP) · Forgot password (4 steps) · Home, Search, Applications, Profile (empty placeholders) |
| Automated checks | about **490** code checks, **12** server-contract checks, **12** web-browser checks, **6** Android phone flows, **1** iPhone flow, plus a live-server shape check |
| Test coverage | **98.6%** of the app's logic is exercised by automated tests (target was 85%) |
| Decisions recorded | **20** (D1 to D20), each with the reason |
| Website problems found | **21**, written up separately for you to discuss with the client (section 7) |

---

## 2. What was delivered, in plain terms

### The candidate can

| Action | How it works | Same as the website? |
| --- | --- | --- |
| **Sign up** | Enters name, mobile number, email and password, ticks the Terms and Privacy boxes, receives an OTP by SMS, enters it, and the account is created and signed in. | Yes: same fields, rules, messages. |
| **Sign in** | Email and password. A recruiter's account is refused with the website's own message. | Yes. |
| **Forgot password** | Mobile number, then OTP, then sees a masked email ("c***e@…") to confirm the account, then sets a new password, then goes back to sign in. | Yes. |
| **Stay signed in** | Closing and reopening the app keeps the candidate signed in. The login is checked with the server on each start. | Better than the website: it also works when the phone is briefly offline. |
| **Sign out** | Clears the login from the phone and all cached data. | Yes. |
| **Success animation** | The same animation as the website after signing in or creating an account. | Yes (same animation files). |

### What the app does when something goes wrong

Phase 1 also covered the unhappy paths, because that is where apps get rejected by the stores or lose users:

- wrong password, unknown account, suspended account, taken email or phone number;
- wrong or expired OTP, and the server's "too many OTP requests, try again in 15 minutes" message;
- no internet, slow server, server error, a server reply in an unexpected shape;
- an expired login (the screen now says *"Your session has expired. Please sign in again."*).

Messages are the website's wording. Where the website had no wording (offline, timeout), we wrote short plain ones.

### Quality and accessibility

- Layouts were checked at the **smallest phone width (320 px)** and at the **largest system font size (2×)**.
- Every button and field has an identifier and a spoken label for **screen readers** (TalkBack/VoiceOver). We found and
  fixed two real problems here that only showed on the physical phone (the OTP boxes and the pop-up messages were
  invisible to Android's screen reader).
- The red used for small error text was slightly too light to read comfortably (it fails the standard contrast check);
  the app uses a slightly darker red (decision D15).
- Light theme only, exactly like the website, even when the phone is in dark mode.

---

## 3. How we know it works

We test at five levels. A flow only counts as done when it passes on the real phone.

| Level | What it checks | Result (25 Oct) |
| --- | --- | --- |
| **Code checks** (about 490) | Rules, messages, screens in every state (loading, error, empty, success), the network layer, storage | All pass; 98.6% of the logic covered |
| **Server contract checks** (12) | The app's code against a real copy of the backend: sign in, sign up, OTP, reset, job lists | All pass |
| **Live-server shape check** | Three public, read-only requests to the live server confirm it still answers the way the app expects (10 jobs, 62 government jobs, 5 international jobs found). No login, nothing changed. | Pass |
| **Web-browser checks** (12) | Sign-in screen on two phone-sized browsers, plus a "nothing is wider than a 320 px screen" check | All pass |
| **Real Android phone** (6 flows) | Open app, sign in and out, recruiter refused, sign up with OTP, forgot password, stay signed in after restart | **6 of 6 pass** in one 10-minute run |
| **iPhone simulator** (1 flow) | The iPhone build opens on the login screen | Pass (screenshot reviewed) |

**Two screen recordings** for the client were made on the real phone, against the test server with fake accounts:
`phase1-signup.mp4` (new account with OTP) and `phase1-login.mp4` (sign in, sign out). They are on Raj's laptop in
`recordings/`, not in the repository.

---

## 4. Safety rules that are built in

These are enforced by automatic checks, not just by good intentions:

1. **Only the final store app may talk to the live ApronHanger server.** Test builds and the development app use a
   separate **test** backend with fake accounts (decision D20). The build refuses to start if a test build is pointed
   at the live server. The live server was only ever read, never changed.
2. **No real people's data is used in testing.** Test accounts use `.test` email addresses and fake numbers
   (9000000001 to 9000000003, OTP 123456, which works only on the test backend).
3. **No personal data in crash reports.** Emails, phone numbers, tokens and form contents are stripped before anything
   is sent (this is unit-tested).
4. **The login is stored in the phone's protected storage** (Android Keystore / iPhone Keychain), never in plain files.
5. **Nothing can be sent to the stores by accident.** There is no store-submission configuration; that needs Raj's OK.
6. **The repository is private** (it was public until 25 Oct and was made private; no passwords were ever in it).

---

## 5. Decisions made in Phase 1

All are recorded with their reasons in `docs/DECISIONS.md`.

| # | Decision | Who |
| --- | --- | --- |
| D1 | Windows laptop, no Mac, no Docker; Android on a real phone; iPhone checks in the cloud | Raj |
| D2 | App ID `work.apronhanger.candidate` (permanent once published) | Raj |
| D3 | Test OTP `123456` for fake numbers on the test backend only; real SMS only to Raj's own number | Raj |
| D5 / D10 | Website domain `apronhanger.work`; link scheme `apronhanger://` | Raj |
| D7 / D8 | Accounts made with the client's project email; Expo free plan | Raj |
| D9 | Expo SDK 58 (latest stable at project start) | Raj |
| D11 / D12 | Light theme only like the website; "Messages" and admin "view as candidate" are not in the app | Raj |
| D13 / D14 | Separate free test database and file storage; no real emails in testing | Raj |
| D15 | Darker red for small error text (readability) | Raj |
| D16 | Gradient on the Create Account button like the website | Raj |
| D17 | "Edit signup details" keeps what the user typed (the website erases it) | Raj |
| D18 | The login screen explains why the user was signed out | Raj |
| D19 | The website's own animations (Lottie) are used in the app | Raj |
| D20 | Only the store build uses the live server | Raj |

Still **proposed, not decided:** D4, a staging backend (a safe copy of the server) so the client can try test builds
without your laptop. It was postponed on 25 Oct (see section 8).

---

## 6. Problems met and how they were solved

| Problem | What it was | Solution |
| --- | --- | --- |
| Android build failed after 47 minutes | Windows limits file paths to 260 characters; the app's native code needs longer | Moved the project to a short folder, turned on Windows long paths, installed a newer build tool (CMake 3.31.6) and automated its setup so it survives a rebuild |
| OTP boxes showed a ghost digit, then vanished for screen readers | Two different fixes to hide the real input each broke something on Android | Redesigned: real input sits under the six boxes; covered by tests |
| Pop-up messages unreadable to screen readers | Container with text inside was ignored by Android | Messages carry their own spoken label |
| Fields hidden behind the keyboard | Android doesn't scroll them into view | Screens now scroll the typed-in field above the keyboard |
| Cloud iPhone testing cost money | Expo's own cloud test jobs need the $19/month plan | Used GitHub's free Mac machines instead (see section 9) |
| Web version broke silently | An added animation library had no web support | Placeholder on web; the web checks now catch such breaks |
| OTP limit blocked repeated tests | The server allows 5 OTP requests per 15 minutes | Test copy of the server allows 100 in test mode only; real limits untouched and covered by code checks |
| Phone's own pop-ups interfered | Realme "security test" screen and Google's "Save password?" sheet cover the app | Test flows close them with Back (never "Never") |

---

## 7. Problems found in the live website

While reading the website's code to match it exactly, we found **21 problems in the live website and server**. None came from
the app. The most important ones in plain terms:

Examples: lost job listings once there are more than 50, accounts that differ only by capital letters, a broken
"View Offer Letter" button, every job saying "Posted today", missing database setup files. The security and privacy
ones are handled separately with Raj and are not described in this public repository.

Each has a business explanation, a severity, and a rough size in a **separate document** for discussion with the client
and for proposing paid fixes (they are outside the app contract). It is on Raj's laptop in `docs/client/` and has been
kept out of the repository on purpose.

---

## 8. Open items

**Needs Raj**

- **Accept Phase 1**, then CLAUDE.md moves to Phase 2.
- **Revoke the three keys pasted in chat** (Expo, GitHub, Render staging) and create new ones straight into `.env.local`.
  The GitHub one expires by itself after 30 days.
- **Task 0 paperwork:** confirm the App ID is final (D2), and create the Sentry project so crash reports can be switched on.
- **Decide about the issues document:** commit it to the private repository, or keep it local.

**Needs the client**

- An **Apple Developer account** and a **Google Play Console account** (fees billed to the client, D7), and an
  **iPhone** to test on before the App Store submission. TestFlight is the way to put a real build on it.

**Postponed (Raj's call on 25 Oct)**

- **Staging backend (D4):** needed before the client can try test builds on their own phones. Render requires a payment
  card even for a free server when created through its API (the dashboard may not; untested). Everything is ready to
  deploy (`npm run staging:deploy`) once there is a host.

**Known and accepted**

- **One Metro warning** (the development server prints it when starting). It comes from a library (Sentry) and does not
  affect the app; the app's code is clean (no `any`, no leftover TODOs).
- **The first Android "preview" file (EAS build 7a176915) points at the live server.** Do not install or share it. A new
  preview build is made after the staging backend exists.
- **Real SMS delivery is untested** (needs real Fast2SMS keys); only the test OTP path was exercised.
- **Crash reporting (Sentry) is built but switched off** until the project address is added.

---

## 9. Costs and resources

| Item | Used | Cost |
| --- | --- | --- |
| Expo (build servers) | 2 builds (iPhone simulator, Android preview) of the free monthly allowance | free |
| GitHub (private repo, iPhone tests on Mac machines) | about 30 of 2,000 free minutes in one iPhone run; allows roughly 12 to 15 such runs a month | free |
| Neon database (test) | dev database | free |
| Cloudinary (test files) | dev account | free |
| Render | read-only access to the live server; nothing deployed | free |
| Expo Starter plan ($19/month) | not bought; needed only for Expo's own cloud test runs, which we replaced | $0 |

Expected later: Apple Developer (about $99/year) and Google Play (one-time $25), billed to the client.

---

## 10. What comes next: Phase 2, Jobs (planned: one week)

- **Home feed** with recommended jobs and match score, categories, pull to refresh.
- **Search** with filters (role, city, salary, experience, job type) and sort.
- **Job details**, similar jobs, **save/unsave**, the **Saved** list.
- **Government jobs** and **international jobs** lists and details.
- The same checks as Phase 1: automated tests first, then a pass on the real phone.

Known constraint: the server returns at most 50 jobs per request, like the website (problem 3 above).

---

# Appendix: technical summary (for Raj and developers)

### A. Stack

Expo SDK 58 (React Native 0.88, new architecture, React Compiler), TypeScript strict, Expo Router (file routes), TanStack
Query (server state), Zustand (session), React Hook Form + Zod (forms, same rules as the website), expo-secure-store,
expo-network, expo-updates (fingerprint runtime; OTA enabled for preview/production, nothing published), expo-linear-gradient,
lottie-react-native, expo-symbols, `@sentry/react-native` (off until a DSN is set), Inter via `@expo-google-fonts/inter`.
Tests: Jest (jest-expo) + React Native Testing Library + MSW, Playwright (Chromium), Maestro. No Docker.

### B. Repository layout (28 commits, about 3,200 lines of app code and 4,700 lines of tests)

```
src/app/        routes: (auth) login, signup, forgot-password; (tabs) Home, Search, Applications, Profile; dev-ui catalog
src/api/        createApiClient (the only fetch), client instance, ApiError, Zod schemas (auth, jobs, common)
src/features/auth/  session store, auth API, validation, messages, AuthModeTabs
src/components/ui/  Button, TextInput, PasswordInput, OtpInput, Checkbox, Toast, OfflineBanner, Skeleton, ErrorState, ...
src/theme/      tokens from the website's CSS, fonts, FontGate (splash held until fonts load)
src/lib/        env validation, secureStorage (.native/.web), queryClient, sentry + scrubber
plugins/        withWindowsCmake (keeps the Windows long-path build fix on every prebuild)
scripts/        backend:local (copy of ../job/backend + patches), staging:sync/deploy, seed
e2e/maestro/    smoke + 5 auth flows · e2e/web/ 3 Playwright specs
tests/contract/ against the local backend · tests/drift/ read-only production shape check
.github/workflows/ci.yml (lint, typecheck, tests) and ios-e2e.yml (manual, macOS)
docs/           PLAN, PHASE-1, DECISIONS (D1-D20), SETUP, reference/{API,SCREENS,THEME}.md
```

### C. Environments

| Variant | App name | Backend |
| --- | --- | --- |
| development | ApronHanger (Dev) | `http://localhost:3000` (local copy, dev Neon DB, OTP test mode) via `adb reverse` |
| preview | ApronHanger (Preview) | the test backend (`PREVIEW_API_URL` once staging exists); never the live server |
| production | ApronHanger | live backend (https only) |

`app.config.ts` rejects any non-production variant that resolves to `onrender.com` or `apronhanger.work`.

### D. Commands

```
npm run check            lint + typecheck + tests (must pass before every commit)
npm run backend:local    local backend copy on :3000 (dev Neon DB, seeded accounts)
npm run test:contract    contract tests (needs backend:local)
npm run drift-check      read-only GETs on production, parsed with our schemas
npm run e2e:web          Playwright · npm run e2e:android   Maestro on the phone
npm run staging:sync / staging:deploy   staging backend (postponed, see section 8)
```

### E. Backend changes: none

`../job` was only read. The local and staging copies add two local-only patches (OTP test mode, raised OTP limit in
test mode) and a seed (candidate and recruiter accounts, 2 hospitals, 4 jobs). `prisma db push` fills the tables the
job repo's migrations lack (issue 13 in the website-issues document).

### F. Key numbers

28 commits · 57 app source files · 47 test files · 489 Jest tests (98.6% line coverage, gate 85%) · 12 contract ·
3 drift · 12 Playwright · 6 Maestro flows on Android · 1 iPhone-simulator flow · 20 decisions · 3 reference documents
(about 800 lines) · 2 cloud builds used.

---

*Note (26 Oct 2026): the hotfix, the staging decision (D4: Raj's own Render account) and the open items moved on after this summary; `docs/HANDOFF.md` is the current state.*
