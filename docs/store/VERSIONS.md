# Real versions in the build (Stage 0, read 2026-10-31)

Read from `package.json`, `node_modules/*/package.json`, `app.config.ts`, `eas.json`, `android/` (prebuilt, git-ignored)
and the Expo / React Native gradle plugins in `node_modules`. No build, prebuild or EAS command was run. App commit at
the time: `189311c` (2026-10-31).

## Platform

| Item | Value | Where it comes from |
| --- | --- | --- |
| Expo SDK | **58** (`expo` 58.0.19; `expo-modules-core` 58.0.26) | `node_modules/expo/package.json` |
| React Native | **0.88.0**, React 19.3.0, Hermes on, New Architecture on | `package.json`, `android/gradle.properties` (`hermesEnabled=true`, `newArchEnabled=true`) |
| React Compiler | on (`experiments.reactCompiler: true`) | `app.config.ts` |
| TypeScript | 6.0.3 | `package.json` |
| Node for EAS builds | 24.19.0 (`build.base.node`) | `eas.json` |
| EAS CLI | `>= 16.0.0` required; `appVersionSource: remote`; production `autoIncrement: true` | `eas.json` (eas-cli is not installed in the repo) |
| App version | `1.0.0` (`version` in `app.config.ts`); build number / versionCode come from EAS (remote) | `app.config.ts`, `eas.json` |
| Runtime version policy | `fingerprint` | `app.config.ts` |
| Updates | on for preview and production, `ON_LOAD`, URL `https://u.expo.dev/3bb496c0-6a80-4efe-a672-ccb36ba6fbd9`; off in development | `app.config.ts` |
| Orientation / theme | portrait; `userInterfaceStyle: light` (D11) | `app.config.ts` |

## Android

| Item | Value | Where it comes from |
| --- | --- | --- |
| compileSdk | **37** | Expo root gradle plugin default `getVersionOrDefault("compileSdk", "37")` (`node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoRootProjectPlugin.kt:206`); React Native catalog `compileSdk = "37"`; Expo docs SDK 58 row: 37. Not overridden in `app.config.ts` (no `expo-build-properties` android SDK values). |
| targetSdk | **36** (Android 16) | same plugin line 207 (`"36"`); RN catalog `targetSdk = "36"`; Expo docs: 36. Meets Play's 31 Aug 2026 rule. |
| minSdk | **24** (Android 7.0) | same plugin line 205 (`"24"`); RN catalog `minSdk = "24"` |
| buildTools | 37.0.0 | RN catalog `buildTools = "37.0.0"` |
| NDK | **27.1.12297006** (r27b) | RN catalog `ndkVersion`; EAS image `ubuntu-26.04-jdk-17-ndk-r27b-sdk-58` |
| Android Gradle Plugin | 9.2.1 (with `android.builtInKotlin=false`, `android.newDsl=false` opt-outs) | RN catalog `agp = "9.2.1"`; `android/gradle.properties` |
| Java (EAS) | 17 | EAS image name |
| ABIs | armeabi-v7a, arm64-v8a, x86, x86_64 | `android/gradle.properties` |
| Edge-to-edge | `edgeToEdgeEnabled=true` | `android/gradle.properties` |
| Predictive back | `predictiveBackGestureEnabled: false` (manifest opt-out) | `app.config.ts` |
| R8 / shrink | `enableMinifyInReleaseBuilds=true`; `shrinkResources` not set (false); PNG crunch on; `useLegacyPackaging=false` (uncompressed native libs) | `android/gradle.properties`, `android/app/build.gradle` |
| Cleartext http | preview/development only; production false | `app.config.ts` (`expo-build-properties`) |
| Package | `work.apronhanger.candidate` (+ `.preview`, `.dev`) (D2, locked) | `app.config.ts` |
| Permissions (production, expected) | `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE`, `CAMERA`, `POST_NOTIFICATIONS`; blocked: `RECORD_AUDIO`, `READ/WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES/VIDEO/AUDIO`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `SYSTEM_ALERT_WINDOW` | D26 + `app.config.ts`; `src/lib/__tests__/appConfig.test.ts`. The prebuilt `android/` folder is the **development** variant (`applicationId work.apronhanger.candidate.dev`), so the merged production manifest is still to be shown (Stage 3.5). |
| Upload format | AAB (production profile has no `buildType: apk`) | `eas.json` |
| **Merged release manifest (local release build, preview variant, 2026-10-31)** | Runtime-prompt permissions: `CAMERA`, `POST_NOTIFICATIONS`. Normal permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `READ_APP_BADGE`, `com.google.android.c2dm.permission.RECEIVE` (FCM), `BIND_GET_INSTALL_REFERRER_SERVICE` (Firebase), and the launcher badge / shortcut vendor permissions (`INSTALL_SHORTCUT`, `*.launcher.permission.READ_SETTINGS`, Samsung/Huawei/Oppo/HTC/Sony badge) pulled in by expo-notifications' badge library. None of the blocked ones (`READ_MEDIA_*`, `RECORD_AUDIO`, storage, biometrics, overlay) is present. `enableOnBackInvokedCallback="false"`; `usesCleartextTraffic="true"` in preview only. | `android/app/build/intermediates/merged_manifest/release/.../AndroidManifest.xml` |
| **16 KB page size (local release APK, arm64)** | `zipalign -c -P 16 -v 4`: "Verification successful"; ELF `PT_LOAD` alignment of all 32 `lib/arm64-v8a/*.so`: ≥ 16 KB, 0 unaligned | scratchpad `elfalign.py`, 2026-10-31 |
| Push | `expo-notifications` plugin (`color #208AEF`); `google-services.json` only from the EAS file variable `GOOGLE_SERVICES_JSON` (not set yet) | `app.config.ts` |
| App links | `https://apronhanger.work` paths `/jobs, /applications, /apply, /profile, /saved-jobs, /gov-jobs, /foreign-jobs, /cv-preview, /auth`, `autoVerify` (production only); `assetlinks.json` not published | `app.config.ts`, `docs/store/README.md` |

## iOS

| Item | Value | Where it comes from |
| --- | --- | --- |
| Deployment target | **16.4** (Expo SDK 58 minimum; React Native alone would allow 15.1) | Expo docs SDK 58 "iOS 16.4+"; `expo-build-properties` `EXPO_SDK_MINIMAL_SUPPORTED_VERSIONS.ios.deploymentTarget = '16.4'`; `react-native/scripts/cocoapods/helpers.rb` `min_ios_version_supported = '15.1'`. Not overridden in `app.config.ts`. |
| Xcode (EAS) | 27.1 RC on macOS 26.6.2 (`macos-tahoe-26.6-xcode-27.1`, alias `sdk-58`/`latest`); RN requires Xcode ≥ 16.1 | Expo infrastructure page; `helpers.rb` |
| iPad | `ios.supportsTablet` not set → false (iPhone-only) | `app.config.ts`, Expo config reference |
| Encryption | `ITSAppUsesNonExemptEncryption: false` | `app.config.ts` |
| Usage strings | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (texts in `app.config.ts`); no microphone, no Face ID (`faceIDPermission: false`) | `app.config.ts` |
| Associated domains | `applinks:apronhanger.work` (production only); `apple-app-site-association` not published | `app.config.ts`, `docs/store/README.md` |
| Privacy manifest (app level) | **none** (`ios.privacyManifests` not set) | `app.config.ts` |
| Privacy manifests shipped by packages | expo-application, expo-constants, expo-device, expo-eas-client, expo-file-system, expo-notifications, expo-system-ui, lottie-react-native, react-native (React, cxxreact, timing, boost, glog, RCT-Folly) | `find node_modules -name PrivacyInfo.xcprivacy`. Sentry's comes with the `sentry-cocoa` pod at build time (not in node_modules). |
| Bundle id | `work.apronhanger.candidate` (+ `.preview`, `.dev`) | `app.config.ts` |

## Native libraries (everything with native code, installed versions)

| Package | Version | Expo SDK package? | Note |
| --- | --- | --- | --- |
| expo | 58.0.19 | yes | |
| expo-modules-core | 58.0.26 | yes | |
| expo-router | 58.0.26 | yes | navigation (no React Navigation) |
| expo-build-properties | 58.0.11 | yes | config plugin only |
| expo-constants | 58.0.13 | yes | |
| expo-device | 58.0.5 | yes | |
| expo-document-picker | 58.0.4 | yes | system file picker, no permission |
| expo-file-system | 58.0.11 | yes | |
| expo-font | 58.0.10 | yes | Inter (`@expo-google-fonts/inter` 0.4.2, JS only) |
| expo-glass-effect | 58.0.5 | yes | iOS 26 glass |
| expo-image | 58.0.17 | yes | |
| expo-image-picker | 58.0.10 | yes | camera + system photo picker |
| expo-linear-gradient | 58.0.3 | yes | D16 |
| expo-linking | 58.0.14 | yes | |
| expo-network | 58.0.4 | yes | offline detection |
| expo-notifications | 58.1.6 | yes | push (Phase 4) |
| expo-print | 58.0.7 | yes | CV PDF |
| expo-secure-store | 58.0.2 | yes | tokens |
| expo-sharing | 58.0.20 | yes | |
| expo-splash-screen | 58.0.11 | yes | |
| expo-status-bar | 58.0.4 | yes | |
| expo-symbols | 58.0.4 | yes | SF Symbols on iOS |
| expo-system-ui | 58.0.6 | yes | |
| expo-updates | 58.0.18 | yes | OTA |
| expo-web-browser | 58.0.6 | yes | in-app browser for links |
| @expo/ui | 58.0.23 | yes | |
| @sentry/react-native | 8.28.0 | no (outside SDK) | crash reports; Apple privacy manifest shipped by sentry-cocoa ≥ 5.22.1 of the RN SDK |
| @react-native-community/datetimepicker | 9.2.1 | no (Raj approved, D29.4) | |
| @shopify/flash-list | 2.3.2 | no | lists |
| lottie-react-native | 7.5.0 | no (D19) | **on Apple's listed-SDK list**: ships its own PrivacyInfo.xcprivacy |
| react-native-gesture-handler | 3.3.0 | no (Expo-managed version) | |
| react-native-reanimated | 4.7.1 | no (Expo-managed version) | |
| react-native-worklets | 0.13.0 | no | required by Reanimated 4 |
| react-native-safe-area-context | 5.10.1 | no (Expo-managed version) | |
| react-native-screens | 4.30.0 | no (Expo-managed version) | |
| react-native | 0.88.0 | | Hermes (on Apple's listed-SDK list; manifest shipped) |

JS-only dependencies (no native code, listed for completeness): @hookform/resolvers 5.9.2, @tanstack/react-query 5.104.x,
react-hook-form 7.91.0, react-native-web 0.21.4, zod 4.6.7, zustand 5.0.16, react-dom 19.3.0.

Not installed: `expo-dev-client` (development builds use the plain debug build).
