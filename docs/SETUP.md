# Machine setup

Follow the official install page for each tool; versions move fast. Use the versions Expo's docs
recommend for the SDK in `docs/DECISIONS.md` (D9).

## Everyone (Windows or Mac)

1. Git, VS Code, Node.js LTS (no Docker needed, see D1 and D13)
2. GitHub CLI: install from https://cli.github.com, then `gh auth login` with the GitHub account that can see the `job` repo.
   Claude Code uses it to clone the reference repo and to create the new app repo.
3. Claude Code, logged in
4. EAS CLI: `npm install -g eas-cli`, then `eas login` with the project Gmail's Expo account
5. Android:
   - Android Studio with Android SDK, Platform-Tools, Emulator, and the latest SDK Platform (Android 16, API 36)
   - JDK 17 (Expo's Android Studio guide links the recommended build)
   - Set `ANDROID_HOME` and add `platform-tools` and `emulator` to PATH
   - Create 1 emulator: Pixel 8 on API 36, and set its RAM to 2048 MB (Device Manager → Edit → Advanced).
     Use it only when the real phone isn't enough. Close Chrome tabs and the emulator when not needed.
   - Guide: https://docs.expo.dev/get-started/set-up-your-environment/ (choose Android Emulator, Development build)
6. Maestro CLI: https://docs.maestro.dev (Getting started → Installing Maestro). Needs Java 17+.
   Check with `maestro --version`. `maestro studio` helps record flows.
7. Playwright browser: `npx playwright install chromium` (inside the app repo, after Task 3)
8. Playwright MCP for Claude Code (lets Claude Code open Expo web in Chromium and look at screens):
   `claude mcp add playwright npx @playwright/mcp@latest`
9. A real Android phone with USB debugging on (Settings → About → tap Build number 7 times →
   Developer options → USB debugging). This is the main test device on an 8 GB laptop.
10. An iPhone with Expo Go, for early iOS checks

## iOS

- **Without a Mac** (likely setup):
  - Early checks: Expo Go on a real iPhone (works while we only use Expo SDK modules)
  - Automated iOS tests: EAS Workflows `maestro` job runs our Maestro flows on an iOS simulator in the cloud
    (build profile `e2e-test` with `ios.simulator: true`; no Apple account needed for simulator builds).
    The Maestro job type is marked alpha by Expo, so keep the Android local run as the main check.
  - Real-iPhone builds: once the client's Apple account is ready, internal distribution or TestFlight
- **With a Mac**: Xcode (latest, from App Store) + iOS Simulator + Command Line Tools; run `npx expo run:ios`
  and `maestro test` locally as on Android

## Local backend

Needs the reference repo at `../job` and `.env.local` filled (dev Neon database URL, dev Cloudinary keys,
`TEST_MOBILE`). No Docker.

```
npm run backend:local      # copies ../job/backend to .reference-backend, migrates the dev database, seeds, starts :3000
adb reverse tcp:3000 tcp:3000   # lets the phone/emulator on USB use http://localhost:3000
```

`../job` itself is never changed. Local-only patches live in `scripts/patches/` and are applied to the copy.

## Project layout on disk

```
work/
  job/                 # reference repo, branch conflict-resolution1 (READ-ONLY)
  apronhanger-app/     # this repo
```

Open Claude Code inside `apronhanger-app/`. `.claude/settings.json` gives it read access to `../job`
and blocks edits there. Check with `/permissions` the first time.
