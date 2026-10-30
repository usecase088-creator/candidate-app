# Data inventory: everything that leaves the phone (Stage 4.1)

Draft from the code on 2026-10-31 (`src/api/**`, `src/lib/sentry.ts`, `src/features/push/pushService.ts`, `app.config.ts`).
**Still to confirm against the real network traffic of the release build** (Stage 4.1 asks for a capture; not done: no phone was
connected overnight). Everything below is sent over HTTPS only in the production build.

## 1. Our backend (`https://job-ojsr.onrender.com`, Render; database Neon; files Cloudinary via the backend)

| Endpoint | Data sent | Why | Store category |
| --- | --- | --- | --- |
| `POST /api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout` | email, password; refresh token | sign-in | Personal info (email), credentials |
| `POST /api/auth/signup/send-otp`, `/verify-otp`, `/api/auth/forgot-password`, `/api/auth/verify-otp` | name, mobile number, email, password, OTP | account creation, password reset | Personal info (name, phone, email) |
| `GET/PUT /api/candidates/me` | the whole profile: name, phone, email, role, specialty, experience, registration number and council, employer, summary, city/state, languages, skills, education, certifications, work history, salary, notice period, preferred locations, availability, document list | profile and CV | Personal info (name, email, phone, address, other), "work history" = other info |
| `POST /api/upload/avatar`, `/api/upload/cv`, `/api/upload/documents` | profile photo; CV file; document files (PDF/JPG/PNG/WebP) | profile, applications | Photos; Files and docs |
| `GET /api/jobs`, `/api/jobs/:id`, `/api/gov-jobs`, `/api/intl-jobs`, `/api/things` | search text and filters; auth token | browsing | App activity (search) |
| `GET/POST/DELETE /api/saved-jobs` | job id | saved jobs | App activity |
| `GET/POST /api/applications` (+ answers, interview, documents, offer actions) | job id, answers to the job's questions, CV, typed reasons | applying | Personal info / Files / App activity |
| `GET /api/notifications`, `.../read`, `read-all` | ids | notifications | App activity |
| `POST/DELETE /api/push-tokens` | Expo push token, platform | push | Device or other IDs |
| `POST /api/account/delete` | password | account deletion | credentials |
| `GET /api/app-config` | app version header (`X-App-Version`), platform | force-update / flags | App info |
| every request | `X-App-Version`, bearer token | | |

## 2. Sentry (`@sentry/react-native` 8.28.0, project `apronhanger-candidate-app`, org `rajendra-3g`)

- Sent: crash and error events, breadcrumbs, device model, OS version, app version, build variant (`environment`), API error kind/status/path and schema issues for parse errors.
- Not sent: `sendDefaultPii: false`, no screenshots, no view hierarchy; `beforeSend`/`beforeBreadcrumb` scrub emails, phone numbers, tokens and `refreshToken`/`pushToken` keys (unit-tested in `src/lib/__tests__/sentryScrub.test.ts`). No user id is set.
- Store category: Google "App info and performance: Crash logs, Diagnostics"; Apple "Diagnostics: Crash Data, Performance Data, Other Diagnostic Data", **not linked to the user**, no tracking.
- CHECK before the forms: open one real production-build event in Sentry and confirm no email, phone, name, token or IP.

## 3. Expo services

| Service | Data | Why |
| --- | --- | --- |
| EAS Update (`https://u.expo.dev/<project>`) | runtime version, platform, channel, update id, an anonymous install id used by expo-updates | OTA JavaScript updates |
| Expo push service (`exp.host`) | the device push token, sent **by our backend**, not by the app | push delivery |

## 4. Google / Apple

| Service | Data | Why |
| --- | --- | --- |
| Firebase Cloud Messaging (Android) | device registration token (Firebase project `candidate-app-69427`) | push transport |
| APNs (iOS) | device token | push transport |
| Google Play / App Store | install and crash statistics kept by the stores themselves | store |

## 5. Not collected

No ads SDK, no analytics SDK, no location, no contacts, no calendar, no microphone, no health data, no payments, no advertising ID, no tracking across apps.

## 6. Kept on the phone (not sent anywhere)

SecureStore: access/refresh tokens, cached user, push token, "push asked" flag. App-private folder: profile-builder draft and picked files per user id (`profile-drafts/<userId>/`), cleared on sign-out and after save. expo-updates cache. Nothing in AsyncStorage.
