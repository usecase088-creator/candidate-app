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
   configured in the committed `.mcp.json` (pinned `@playwright/mcp`, Chromium, Pixel 7). Claude Code asks
   once to approve the project server; check with `/mcp`. Uses the Chromium from step 7.
9. A real Android phone with USB debugging on (Settings → About → tap Build number 7 times →
   Developer options → USB debugging). This is the main test device on an 8 GB laptop.
10. An iPhone with Expo Go, for early iOS checks

## Raj's laptop — what is actually installed (2026-10-25)

No Android Studio (8 GB RAM): command-line SDK only, real phone instead of an emulator.

| Tool | Version | Where / how |
| --- | --- | --- |
| Node | 24.19.0 | winget `OpenJS.NodeJS.LTS` |
| JDK | Microsoft OpenJDK 17.0.20 | winget `Microsoft.OpenJDK.17` → `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` |
| adb | platform-tools 37.0.1 | winget `Google.PlatformTools` (on PATH) + same version in the SDK |
| Android SDK | cmdline-tools 16111833, platform `android-36`, build-tools `36.1.0` | `%LOCALAPPDATA%\Android\Sdk` (zip from dl.google.com, SHA-1 checked). Gradle downloads anything else it needs. |
| Maestro | 2.11.0 | `%LOCALAPPDATA%\maestro` (GitHub release zip, SHA-256 checked) |
| GitHub | Git Credential Manager (no `gh`) | user `rajendra0000` |

User environment: `JAVA_HOME`, `ANDROID_HOME`, PATH += `%JAVA_HOME%\bin`, `%ANDROID_HOME%\cmdline-tools\latest\bin`,
`%LOCALAPPDATA%\maestro\bin`. Restart VS Code after changing them.

Install more SDK packages with a package file (the `.bat` launcher splits arguments at `;`):
`sdkmanager --package_file=packages.txt` with one package per line, e.g. `platforms;android-36`.

Git Bash rewrites phone paths like `/sdcard/...` into Windows paths. Prefix adb commands with
`MSYS_NO_PATHCONV=1`.

### Test phone: Realme P3x 5G (RMX3944), Android 15 (API 35), 6 GB RAM

- Developer mode: Settings → About phone → Version → tap **Version number** 7 times.
- Settings → Additional settings → Developer options → **USB debugging** on, **Disable permission monitoring** on.
- USB mode: **File transfer / Android Auto**. Accept "Allow USB debugging?" with "Always allow".
- Check: `adb devices` shows the phone as `device`.

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
C:\dev\
  job\                 # reference repo, branch conflict-resolution1 (READ-ONLY)
  ah\                  # this repo (short name on purpose, see "Known issue" below)
```

Open Claude Code inside `apronhanger-app/`. `.claude/settings.json` gives it read access to `../job`
and blocks edits there. Check with `/permissions` the first time.

### Known issue: Android build fails on long Windows paths (2026-10-25)

First `npx expo run:android` failed after 47 min in `react-native-reanimated` C++ (`ninja: error: mkdir(...): No such file or directory`).
Cause: Windows 260-character path limit. `LongPathsEnabled` is 0, and the SDK's CMake 3.22.1 ships ninja 1.10.2,
which has no long-path support anyway.

The project path counts twice: reanimated's shared C++ (`Common/cpp`) is outside its `android/` CMake folder,
so CMake puts the full source path inside the object path
(`<project>\node_modules\react-native-reanimated\android\.cxx\...\reanimated.dir\C_\<project>\node_modules\react-native-reanimated\Common\cpp\...cpp.o`).
Every character in the project path adds 2 to the deepest path.

| Project path | Deepest path |
| --- | --- |
| `C:\Users\pc\Desktop\apronhanger-app` | 294 (measured) |
| `R:\apronhanger-app` (subst) | 260 (measured) |
| `C:\dev\apronhanger-app` | ~270 (estimated, fails) |
| `C:\dev\ah` | ~245 (estimated) |

Tried and rejected:
- `subst R: <project>`: expo-modules-autolinking can't find `package.json` at a drive root (`R:\`).
- Long paths (admin registry change + newer CMake): changes the whole machine; NDK tools may still fail.

**Decision: the project lives at `C:\dev\ah`.** Don't move it to a longer path. If a new native library breaks
the limit again, the fallback is moving `.cxx` to a short folder with AGP `externalNativeBuild.cmake.buildStagingDirectory`.

Before retrying: delete the stale `android/.cxx` folders under `node_modules/*/android/.cxx` and `android/app/.cxx`.
Gradle, NDK 27.1, build-tools 36/37 and platform 37 are already downloaded, so the next build is much faster.
