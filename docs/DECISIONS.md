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

## D2 — Bundle ID / package name (proposed, Raj to confirm)

The app's permanent ID inside the stores, like a username. Users never see it. Google calls it
"package name", Apple calls it "bundle ID". **Once the app is published it can never be changed**;
a new ID means a brand new app with zero users.

It is written as the company domain backwards plus the app name.

- Proposed: `in.apronhanger.candidate` (domain apronhanger.in, candidate app; leaves room for a recruiter app later)
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

## D5 — Candidate domain for app links (decided 2026-10-24)

Live candidate website: **apronhanger.work** (Raj). Email links on this domain can open the app (Phase 4).

## D6 — Which backend commit is live (open, needed before Phase 4)

Check the Render dashboard for the deployed commit before any backend change.

- Reference clone (2026-10-24): `apronhanger/job`, branch `conflict-resolution1`, commit
  `3fa688523404a75b718ed363ee683e95ea6d7a3e` (2026-10-08). This is what our docs describe. It is **not**
  confirmed as the live commit; D6 stays open.

## D7 — Account for app services (decided)

Expo is the service that builds the app files for the stores. It needs an account, and so do
Sentry (crash reports) and Firebase (Android push, Phase 4).

- **Changed 2026-10-24:** all made with the **email the client provided for this project** (not a Gmail of Raj's),
  on free tiers. Expo, Sentry, Neon (dev), Cloudinary (dev). So they already belong to the client; nothing to hand over.
- Google Play and Apple accounts stay with the client; Raj is added as a team member.
  Apple/Google organisation accounts wait for the D-U-N-S number (not done yet, 2026-10-24).

## D8 — Expo plan (decided)

- Start on the **Free plan**. Running the app on the phone/emulator from the laptop (`npx expo run:android`)
  is free and doesn't use Expo builds at all.
- Free plan has a limited number of low-priority cloud builds per month and only a small number of
  free CI minutes for cloud test runs. It stops when used up (no surprise bill) and resets on the 1st.
- If it runs out in weeks 3–8, take **Starter ($19/month, includes $45 build credit)** for those months and cancel after.

## D9 — Expo SDK version

Latest stable at project start. Claude Code records the exact number here.

## D10 — URL scheme (proposed)

`apronhanger://` — lets links open screens inside the app.

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
