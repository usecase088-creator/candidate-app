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
| CMake (SDK package) | 3.31.6, ships ninja 1.12.1 | `sdkmanager "cmake/3.31.6"`. Needed for long paths, see "Android build on Windows" below. |
| Maestro | 2.11.0 | `%LOCALAPPDATA%\maestro` (GitHub release zip, SHA-256 checked) |
| GitHub | Git Credential Manager (no `gh`) | user `rajendra0000` |

User environment: `JAVA_HOME`, `ANDROID_HOME`, PATH += `%JAVA_HOME%\bin`, `%ANDROID_HOME%\cmdline-tools\latest\bin`,
`%LOCALAPPDATA%\maestro\bin`. Restart VS Code after changing them.

Windows long paths are on (`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled` = 1, set 2026-10-25).

Install more SDK packages with a package file (the `.bat` launcher splits arguments at `;`):
`sdkmanager --package_file=packages.txt` with one package per line, e.g. `platforms;android-36`.
The newer sdkmanager also accepts `/` instead of `;` on the command line, e.g. `sdkmanager "cmake/3.31.6"`.

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
npm run backend:local                 # set up and start on http://localhost:3000 (Ctrl+C to stop)
npm run backend:local -- --no-start   # set up only
adb reverse tcp:3000 tcp:3000         # lets the phone/emulator on USB use http://localhost:3000
npm run test:contract                 # while the backend runs
```

`../job` itself is never changed. What `scripts/backend-local.ts` does, in order:

1. Builds the backend `.env` from `.env.local` (`scripts/backend-local/env.ts`). Refuses `NODE_ENV=production` and any
   database host that isn't `*.neon.tech` (D13). `RENDER_API`, `TEST_MOBILE` and `EXPO_PUBLIC_*` never reach the backend.
   `BREVO_API_KEY` is set empty, so the backend logs and skips every email (D14). The Fast2SMS keys are optional.
2. Copies `../job/backend` to `.reference-backend/` (gitignored; keeps `node_modules`), adds our files from
   `scripts/backend-local/overlay/`, and applies the edits in `scripts/backend-local/patches.ts`. If the job repo
   changes and an edit no longer fits, the run stops and names the file.
3. `npm ci` (only when `package-lock.json` changed) and `prisma generate`.
4. Safety check before touching the database: if it has users but not our seed candidate, it stops
   ("looks like production").
5. `prisma migrate deploy`, then `prisma db push` for the schema parts the job repo has no migration for
   (API.md "Notes for the app" 17). Then the backend's own seed and ours (`overlay/app-scripts/seedApp.ts`, upserts).
6. Starts `src/index.ts` with `tsx`.

**OTP test mode (D3):** with `OTP_TEST_MODE=true`, numbers in `OTP_TEST_NUMBERS` send no SMS and accept `123456`
(any other code: `Invalid or expired OTP`). Other numbers, like `TEST_MOBILE`, go to Fast2SMS and need the real
Fast2SMS keys in `.env.local`; without them that send fails with "Failed to send OTP". All OTP routes share one limit:
**5 requests per 15 minutes per IP**.

**Seed data** (`scripts/backend-local/overlay/app-scripts/seedData.ts`), password `Test@1234` for both accounts:

| Account | Email | Mobile |
| --- | --- | --- |
| Candidate | `candidate@apronhanger.test` | first `OTP_TEST_NUMBERS` entry (forgot-password tests) |
| Recruiter (login must be rejected by the app) | `recruiter@apronhanger.test` | none |

Plus 2 approved hospitals and 4 active jobs. The other test numbers stay free for signup tests.

**Network:** Prisma tries IPv6 first. On a network that hands out IPv6 but doesn't route it (seen on one Wi-Fi,
2026-10-25), every database call fails with "Can't reach database server" even though the host answers on IPv4.
Check with `curl -6 https://www.google.com`; switch network, or make Windows prefer IPv4 (admin):
`netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 60 4`. A sleeping Neon database also needs a few seconds to wake.

## Project layout on disk

```
C:\dev\
  job\                 # reference repo, branch conflict-resolution1 (READ-ONLY)
  ah\                  # this repo (short name on purpose, see "Android build on Windows" below)
```

Open Claude Code inside `ah/`. `.claude/settings.json` gives it read access to `../job`
and blocks edits there. Check with `/permissions` the first time.

### Android build on Windows (long paths)

React Native's C++ builds create object paths longer than Windows' 260-character limit
(`ninja: error: mkdir(...): No such file or directory`). The project path counts twice, because CMake copies
the full source path into the object path, e.g. for gesture-handler's codegen:

```
C:\dev\ah\android\app\.cxx\Debug\<hash>\arm64-v8a\rngesturehandler_codegen_autolinked_build\CMakeFiles\
  react_codegen_rngesturehandler_codegen.dir\C_\dev\ah\node_modules\react-native-gesture-handler\shared\...\*.cpp.o
```

That is 310 characters even at `C:\dev\ah` (288 with `.cxx` moved to a short folder), so a short project path
alone is not enough. `subst` doesn't work either (expo-modules-autolinking can't find `package.json` at a drive root).

What fixed it (2026-10-25):

1. Windows long paths on (admin PowerShell; new processes pick it up, a restart makes sure):
   `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
2. CMake 3.31.6 from the SDK: its ninja 1.12.1 is long-path aware; the default 3.22.1 ships ninja 1.10.2, which is not.
   Stay on CMake 3.x: CMake 4 drops support for the old `cmake_minimum_required` versions some libraries use.
3. Every native module must use it. Nothing in the build sets a CMake version, so AGP falls back to 3.22.1.
   Point AGP at the newer one in `android/local.properties` (machine-specific, not committed; use forward slashes):

   ```
   cmake.dir=C:/Users/pc/AppData/Local/Android/Sdk/cmake/3.31.6
   ```

   `android/` is generated (CNG). **After `npx expo prebuild --clean` or deleting `android/`, add this line again**
   before building. Setting `externalNativeBuild.cmake.version` from the root `build.gradle` does not work
   ("It is too late to set version").

Keep the project at `C:\dev\ah` anyway: shorter paths keep us clear of tools that ignore long paths.
After a failed native build, delete `android/app/.cxx` and `node_modules/*/android/.cxx` before retrying.
First full build: about 12 minutes on this laptop; rebuilds reuse the Gradle cache.

### Running the dev build on the phone

```
adb reverse tcp:8081 tcp:8081    # phone reaches Metro over USB at localhost:8081
npx expo start                   # NOT --localhost: on Windows it listens on [::1] only; adb reverse uses 127.0.0.1
maestro test e2e/maestro/smoke.yaml
```

The first launch after starting Metro bundles everything from scratch and can take over a minute.
