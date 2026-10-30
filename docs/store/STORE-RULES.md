# Store rules that apply to the ApronHanger candidate app

Stage 0 of `docs/LAUNCH-PLAYBOOK.md`. Every rule below is quoted from the official page named next to it, read on
**2026-10-31** unless another date is given. Nothing here is from a blog or a summary. Where two official pages
disagree, both are quoted and the one we follow is named. Where a page could not be read by our tools (Apple pages
that render only with JavaScript), that is said, and the rule is taken from a page that could be read.

Three Expo sources the playbook names do not exist at the URLs given: `expo.dev/blog/how-to-submit-an-app-to-the-app-store-and-google-play`
and `expo.dev/blog/why-apps-get-rejected-from-the-app-store-and-how-to-avoid-it` return "Page not found". The articles
live at `https://expo.dev/articles/shipping-to-the-app-stores` (an index; the two articles are linked from there). The
index only says: "Over 40% of App Store review issues fall under guideline 2.1 App Completeness." That matches Apple's
own App Review page quoted below, which is what we rely on.

How to read the "Us" column: **OK** = the build does this today; **GAP** = the build or the listing does not do it
yet; **RAJ** / **CLIENT** = needs something only they can give; **CHECK** = must be proven on the release build (Stage 1).

---

## 1. Apple App Store Review Guidelines

Source: https://developer.apple.com/app-store/review/guidelines/ ("Last Updated: October 16, 2026").

| # | Rule (quoted) | Us |
| --- | --- | --- |
| 2.1 (a) | "Submissions to App Review ... should be final versions with all necessary metadata and fully functional URLs included; placeholder text, empty websites, and other temporary content should be scrubbed before submission. Make sure your app has been tested on-device for bugs and stability before you submit it, and include demo account info (and turn on your back-end service!) if your app includes a login. ... We will reject incomplete app bundles and binaries that crash or exhibit obvious technical problems." | GAP: `IOS_STORE_URL` in `src/lib/site.ts` still points at the website until the App Store id exists; the privacy-policy and terms URLs must be live (CLIENT); demo account on production (Stage 4). Placeholders: none found in `src/` (the Phase 3 "arrives in the next update" texts were replaced in Phase 4; `dev-ui` redirects home outside development builds). |
| 2.5.2 | "Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps." | CHECK: `expo-updates` is on for preview and production (`checkAutomatically: ON_LOAD`). Allowed only for JavaScript fixes that do not add or change features (playbook Stage 3.9). The guideline never names "over-the-air" updates: this is our reading of 2.5.2, and Expo's own docs only say "you need to follow the rules of the platforms and app stores you are building for" (https://docs.expo.dev/eas-update/introduction/). |
| 2.5.19 | "Don't include any hidden, dormant, or undocumented features in your app; your app's functionality should be clear to end users and App Review." | OK: feature flags from `GET /api/app-config` (PR 4) fail open and hide nothing from review. CHECK that no flag is used to hide a feature during review. |
| 4 (intro) | "Apple customers place a high value on products that are simple, refined, innovative, and easy to use ... the following are minimum standards for approval to the App Store." | Stage 2. |
| 4.2 | "Your app should include features, content, and UI that elevate it beyond a repackaged website." | OK: native screens, native pickers, share sheet, push, app links. |
| 5.1.1 (i) | "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner. The privacy policy must clearly and explicitly: Identify what data, if any, the app/service collects, how it collects that data, and all uses of that data. Confirm that any third party with whom an app shares user data ... will provide the same or equal protection of user data ... Explain its data retention/deletion policies and describe how a user can revoke consent and/or request deletion of the user's data." | GAP/CLIENT: the app links to `https://apronhanger.work/privacy-policy.html` (sign-up and Settings) but the page has never been checked to exist, and its text must cover Sentry, Expo push, Cloudinary, Brevo and the retention list in `ACCOUNT-DELETION-DATA.md`. |
| 5.1.1 (ii) | "Apps that collect user or usage data must secure user consent for the collection ... Ensure your purpose strings clearly and completely describe your use of the data." | OK for camera and photos (purpose strings in `app.config.ts`). CHECK: Sentry crash data is sent without a consent step; see 5.1.2 (i) and section 5 below (Sentry collects crash and diagnostic data not linked to the user, scrubbed). Decide with Raj whether the privacy policy sentence is enough or an opt-out is needed. |
| 5.1.1 (iii) | "Apps should only request access to data relevant to the core functionality of the app ... Where possible, use the out-of-process picker or a share sheet rather than requesting full access to protected resources like Photos or Contacts." | OK: system photo picker and document picker; only camera needs a permission. |
| 5.1.1 (iv) | "Apps must respect the user's permission settings and not attempt to manipulate, trick, or force people to consent to unnecessary data access ... Where possible, provide alternative solutions for users who don't grant consent." | OK: push denied = app works; camera denied = gallery/file picker still works (CHECK on device). |
| 5.1.1 (v) | "If your app doesn't include significant account-based features, let people use it without a login. If your app supports account creation, you must also offer account deletion within the app. Apps may not require users to enter personal information to function, except when directly relevant to the core functionality of the app or required by law." | **GAP (biggest Apple risk):** today every tab redirects to `/login` when signed out (`src/app/(tabs)/_layout.tsx`); job browsing, search, government and international jobs need no account on the website. Playbook Stage 3.1 (guest browsing). Account deletion: in-app at `/delete-account` (PR 9), OK once PR 9 is live. |
| 5.1.2 (i) | "Unless otherwise permitted by law, you may not use, transmit, or share someone's personal data without first obtaining their permission. You must provide access to information about how and where the data will be used. You must clearly disclose where personal data will be shared with third parties ... Your app may not require users to enable system functionalities (such as push notifications, location services, tracking) in order to access functionality, content, use the app ..." | OK: push is optional (asked once after the first application or from Settings). Privacy policy must name the third parties (CLIENT). |
| 5.2.1 | "Don't use protected third-party material such as trademarks ... and don't include misleading, false, or copycat representations, names, or metadata in your app bundle or developer name. Apps should be submitted by the person or legal entity that owns or has licensed the intellectual property and other relevant rights." | CLIENT: the App Store account must be the client's organisation (D7); the "ApronHanger" name and logo are theirs. |
| 2.3.6 (only "government" mention) | "If your app is mis-rated, customers might be surprised by what they get, or it could trigger an inquiry from government regulators." | Apple has no government-affiliation rule beyond 5.2.1 (misleading representations). The government-jobs disclaimer (playbook Stage 3.7) is required by Google (section 3) and is good practice for Apple. |
| 5.6 | "Repeated manipulative or misleading behavior or other fraudulent conduct will lead to your removal from the Apple Developer Program." 5.6.4 App Quality: "Customers expect the highest quality from the App Store, and maintaining high quality content, services, and experiences promotes customer trust." | Note for Stage 6: never claim a bug that does not exist for an expedited review. |

### App Review page ("Avoiding common issues")

Source: https://developer.apple.com/distribute/app-review/

- "On average, over 40% of unresolved issues are related to guideline 2.1: App Completeness, which covers crashes, placeholder content, incomplete information, and more."
- Broken links: "All links in your app must be functional. A link to user support with up-to-date contact information and a link to your privacy policy is required for all apps." → **GAP: the app has no support link or contact anywhere** (grep for `support@` finds only `docs/store/README.md`). Stage 3.3.
- Incomplete information: "If some features require signing in, provide a valid demo account username and password. If there are special configurations to set, include the specifics."
- Privacy policy issues: must "Identif[y] the data the app collects, how it collects that data, and all uses of that data", confirm third parties give "the same or equal protection", and "Explain[] your data retention and deletion policies and describe[] how a user can revoke consent and/or request deletion of their data."
- Inaccurate screenshots: "Screenshots should accurately communicate value and functionality. Use text and overlay images to highlight the user experience, not obscure it."
- Misleading users: "Your app must perform as advertised and should not give users the impression the app is something it is not."
- Review time: "App Review works around the clock, typically reviewing at least 50% of submissions in less than 24 hours and 90% in less than 48 hours."

### Offering account deletion in your app

Source: https://developer.apple.com/support/offering-account-deletion-in-your-app/ (no date on the page).

- "Apps submitted to the App Store that support account creation must also let people initiate deletion of their account within the app."
- "Offer to delete the entire account record, along with associated personal data. You may include additional options, but only offering to temporarily deactivate or disable an account is insufficient."
- "Make the account deletion option easy to find in your app. Typically, it's included in the app's account settings." → OK: Profile → Settings → Delete account.
- "If you're legally required to retain some user information, let people know what information will and won't be retained." → GAP: the in-app deletion screen and the privacy policy must say what is kept (section 3 of `ACCOUNT-DELETION-DATA.md`: applications, hospital notes, interview history, offer letters). Stage 3.4.
- "It's appropriate to confirm the user genuinely intends to delete their account. You may add steps to verify the identity ... However, apps that make it unnecessarily difficult for someone to delete their account will not pass review." → OK: password + confirm, nothing more.
- "Apps not operating in highly regulated industries should not require people to make a phone call, send an email, use a chat support flow, or go through other support flows." → OK (self-service).
- "Additionally, linking out to the default web browser to sign in or register an account provides a poor user experience and isn't appropriate, per App Review Guideline 4." → OK: sign-in is native.

### Upcoming requirements (all already in force)

Source: https://developer.apple.com/news/upcoming-requirements/

- "Since April 28, 2026: Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26 ..." → OK: the EAS image for SDK 58 is `macos-tahoe-26.6-xcode-27.1` (Xcode 27.1 RC), see `VERSIONS.md`.
- "Since September 9, 2026: iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later." → OK (Expo SDK 58 minimum is iOS 16.4).
- "Since January 31, 2026: ... Provide responses to the updated age rating questions for each of your apps by January 31, 2026" → new app: answer the new questionnaire at creation (Stage 4.3).
- "Since May 1, 2024: You'll need to include approved reasons for the listed APIs used by your app's code (including from third-party SDKs) to upload a new or updated app to App Store Connect." → section 5 (privacy manifests).

### Screenshot specifications

Source: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/

- "You must include at least one screenshot and can upload up to 10 screenshots per device size in .jpeg, .jpg, or .png formats" and "Images can't include alpha channels or transparencies."
- "To submit your app, you must provide screenshots for the following required display sizes: iPhone: At least one screenshot for iPhone with Dynamic Island (medium display). iPad (if your app supports iPadOS): At least one screenshot for iPad 13-inch display."
- iPhone with Dynamic Island (medium display): "1179 x 2556 pixels (portrait) ... 1206 x 2622 pixels (portrait)". iPhone with Dynamic Island (large display): "1260 x 2736 ... 1290 x 2796 ... 1320 x 2868 pixels (portrait)". iPhone with Face ID (large display) "1284 x 2778 ... 1242 x 2688": "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided". Other sizes are scaled from these if missing.
- **Disagreement:** Expo's store-assets guide (https://docs.expo.dev/guides/store-assets/, modified July 29, 2026) says "At a minimum, Apple requires you to upload screenshots for iPhone with the dynamic island (6.9 inch)" and "2 to 10 images". Apple's page says the required set is the **medium** Dynamic Island display and "at least one". **We follow Apple** and upload both the medium (1179 x 2556 or 1206 x 2622) and the large (1290 x 2796 or 1320 x 2868) sets so nothing is scaled.
- iPad screenshots are not needed: `ios.supportsTablet` is not set and "Defaults to false" (https://docs.expo.dev/versions/v58.0.0/config/app/).

### App Privacy details (the "nutrition label")

Source: https://developer.apple.com/app-store/app-privacy-details/ and https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy

- "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time."
- "'Tracking' refers to linking data collected from your app about a particular end-user or device ... with Third-Party Data for targeted advertising or advertising measurement purposes, or sharing data collected from your app about a particular end-user or device with a data broker." → we do no tracking.
- "You'll need to provide information about your app's privacy practices, including the practices of third-party partners whose code you integrate into your app, in App Store Connect." and "You must include information about your app's privacy practices and those of third-party partners whose code you integrate into your app."
- Data types we will have to declare (Stage 4, from the real traffic): Contact Info (Name, Email Address, Phone Number, Physical Address), User Content (Photos or Videos, "Other User Content" for CV and documents), Identifiers (User ID, Device ID = push token), Diagnostics ("Crash Data: Such as crash logs", "Performance Data", "Other Diagnostic Data") from Sentry, Usage Data if any.
- "Personal Information" and "Personal Data", as defined under relevant privacy laws, are considered linked to the user." Sentry events are scrubbed and `sendDefaultPii: false`, so Diagnostics can be declared **not linked** only if nothing identifying is sent (CHECK the real event in Stage 1/4).
- "A privacy policy URL is required for all apps, while a user privacy choices URL is optional." Required role to answer: "Account Holder, Admin, or App Manager." → RAJ must be at least App Manager in the client's App Store Connect.

### Age rating

Source: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating and https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions

- Tiers: 4+, 9+, 13+, 16+, 18+ (the definitions page). "An Unrated app can't be published on the App Store."
- 16+ includes "Capabilities: Unrestricted web access" and "Medical or Wellness: Frequent medical or treatment information". "Unrestricted Web Access: Users can navigate to any webpage within the app or freely browse the web. May include: embedded browser functionality or browser app."
- Our answers (draft, Stage 4.3): the app opens only fixed links (privacy, terms, offer letter, job source links) in the system browser sheet, no free browsing → "No" to unrestricted web access. Jobs for nurses/doctors are not "medical or treatment information". No user-generated content shown to other users, no messaging, no ads, no gambling. Expected result: 4+ by content; the client may override higher ("Override to Higher Age Rating") since the target audience is adults. Confirm in the questionnaire.

### Export compliance

Source: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance (the deeper page https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations could not be read by our tools).

- "If your app uses, accesses, contains, implements, or incorporates encryption, and you intend to upload, test, and distribute it, you need to determine your export compliance requirements in App Store Connect."
- "Update your app's information property list (Info.plist) file in Xcode so that you don't need to answer encryption questions with each app submission." → OK: `ITSAppUsesNonExemptEncryption: false` is in `app.config.ts`. The page says: "you're responsible for all liabilities associated with misinterpretation of export regulations or claiming exemption inaccurately." We use only HTTPS/TLS from the operating system. CLIENT to confirm they accept that declaration.

### Privacy manifests and third-party SDKs

Sources: https://developer.apple.com/support/third-party-SDK-requirements/ and https://developer.apple.com/news/?id=3d8a9yyh (29 Feb 2024); https://docs.expo.dev/guides/apple-privacy/

- "You must include the privacy manifest for any SDK listed below when you submit new apps in App Store Connect that include those SDKs ... Signatures are also required in these cases where the listed SDKs are used as binary dependencies."
- On the list and in our build: **Lottie** (`lottie-react-native` ships `ios/PrivacyInfo.xcprivacy`, found in `node_modules`), **hermes** (React Native ships `React/Resources/PrivacyInfo.xcprivacy`). Not on the list: Sentry, Expo, react-native itself.
- "Starting May 1: You'll need to include approved reasons for the listed APIs used by your app's code to upload a new or updated app to App Store Connect."
- Expo: "All Expo SDK packages that use 'required reason' APIs file have a PrivacyInfo file included in the package directory." and "As of now, Apple does not correctly parse all the PrivacyInfo files included by static CocoaPods dependencies." Expo's example adds `NSPrivacyAccessedAPICategoryUserDefaults` reason `CA92.1` under `ios.privacyManifests`.
- Sentry (https://docs.sentry.io/platforms/react-native/data-management/apple-privacy-manifest/): "This guide requires @sentry/react-native@5.22.1 or newer" (we have 8.28.0); its manifest declares UserDefaults `CA92.1`, SystemBootTime `35F9.1`, FileTimestamp `C617.1` and collected data types Crash data, Performance data, Other diagnostic data (not linked, not tracking).
- → GAP: `app.config.ts` has no `ios.privacyManifests` block. Stage 3.6: add the UserDefaults / FileTimestamp / SystemBootTime reasons our code and SDKs need (expo-secure-store, expo-file-system, Sentry), as Expo recommends, or accept Apple's email after the first upload and add what it lists.

### Human Interface Guidelines

The HIG pages (https://developer.apple.com/design/human-interface-guidelines/privacy and .../managing-notifications) render only with JavaScript and could not be read by our tools. Their rules are not quoted here. The enforceable rules are the Review Guidelines 5.1.1 (ii)–(iv) and 5.1.2 (i) above. Android's own page on the same point is quoted in section 3 ("Wait until the user understands the context").

---

## 2. Google Play: policies

### User Data (incl. prominent disclosure, privacy policy)

Source: https://support.google.com/googleplay/android-developer/answer/10144311

- Prominent disclosure and consent: "Must be within the app itself, not only in the app description or on a website; Must be displayed in the normal usage of the app and not require the user to navigate into a menu or settings; ... Must be granted by the user before your app can begin to collect or access the personal and sensitive user data." → applies to data collected in a way the user would not expect. Profile data is typed in by the user for the stated purpose (expected). CHECK: Sentry crash reports go out without a disclosure; the Data safety section and privacy policy cover it (Google's form, below, treats crash logs as "App info and performance"), but decide with Raj whether to add a one-line disclosure on first launch.
- "All apps must post a privacy policy link in the designated field within Play Console" and the policy must also be accessible within the app. → OK in app (Settings, sign-up) once the page is live (CLIENT).
- "Handle all personal and sensitive user data securely, including transmitting it using modern cryptography" → OK: production build is https-only (`usesCleartextTraffic` false in production).
- "Only collect and use data that is necessary for your app's functionality."

### Account deletion

Source: https://support.google.com/googleplay/android-developer/answer/13327111

- "If your app allows users to create an account from within your app ... it must also allow users to request for their account to be deleted." Apps must provide "an in-app path to delete their app accounts and associated data" and "a web link resource where users can request app account deletion and associated data deletion."
- The web resource must work "without sending the user back to the app and requiring them to re-download it to submit their request."
- Retention: some data may be kept for "security, fraud prevention or regulatory compliance" and then developers "must clearly inform users about your data retention practices, for example, within your privacy policy."
- "disclose if your app provides account deletion" and "provide the web link within your Data safety form in Play Console."
- Since May 31, 2024: "Non-compliant apps may face additional enforcement actions in the future".
- → In-app path: `/delete-account` (PR 9). Web path: `https://apronhanger.work/delete-account.html` (PR 5, static page, uploaded by hand to the cPanel host: CLIENT/RAJ). Both need the backend PRs live on production. Retention text: section 3 of `ACCOUNT-DELETION-DATA.md` → privacy policy (CLIENT).

### Data safety form

Source: https://support.google.com/googleplay/android-developer/answer/10787469

- "'Collect' means transmitting data from your app off a user's device." SDK transmissions count. "'Sharing' refers to transferring user data collected from your app to a third party."
- Service providers: a transfer to a provider that "processes it on behalf of the developer" is not sharing (Render, Neon, Cloudinary, Sentry, Expo push act as our processors).
- Ephemeral: "only stored in memory and retained for no longer than necessary to service the specific request in real-time" still goes in the form but is not shown.
- Developers "must complete this form and provide a link to their privacy policy", "must reflect data collection or sharing carried out by such third-party code".
- Data types we expect to declare (Stage 4.2 from real traffic): Personal info (name, email, user IDs, address, phone number, "other info" = profile), Photos and videos (profile photo, document photos), Files and docs (CV, documents), App activity (saved jobs, in-app actions if any), App info and performance (crash logs, diagnostics: Sentry), Device or other IDs (push token).
- Deletion questions: "Does your app provide a way for users to request deletion of their data?" → Yes, with the web URL above.

### Photo and Video Permissions

Source: https://support.google.com/googleplay/android-developer/answer/14115180

- Apps targeting Android 13+ "may only request the READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions if system pickers" "are not sufficient for your app to provide core functionality." "May 28, 2025: Full policy compliance is mandatory for all developers".
- → OK: both permissions are in `blockedPermissions` (D26); pictures come from the system photo picker. CHECK on the merged release manifest (Stage 3.5).

### Deceptive Behavior (government affiliation) and Misrepresentation

Sources: https://support.google.com/googleplay/android-developer/answer/17006354 and https://support.google.com/googleplay/android-developer/answer/9888689

- Misleading Claims: "Apps that falsely claim affiliation with a government entity" and apps that claim "to provide or facilitate government services for which they are not properly authorized" are not allowed. "Don't falsely claim affiliation with a government or an established entity when not properly authorized to do so." "Don't impersonate other apps, brands, or government entities." "Apps that falsely claim to be the official app of an established entity."
- Misrepresentation: apps may not "impersonate any person or organization, or that misrepresent or conceal their ownership or primary purpose." "Ensure your app's title, icon, and description honestly represent its functionality and purpose."
- → GAP: the government-jobs screen (`gov-jobs`) has no "not a government app" note (grep finds none). Stage 3.7: note in the screen and in both listings, with the official source links the website shows.

### Store Listing and Promotion (metadata)

Source: https://support.google.com/googleplay/android-developer/answer/9898842

- "Your app title must be 30 characters or less." "Don't use emojis, emoticons, or repeated special characters in these metadata elements." "Avoid ALL CAPS unless it is part of your brand name." No "store performance or ranking" words ("App of the year", "#1", "Best of Play", "Popular"), no price/promotion words ("free for limited time only"). Title and description must "accurately describe your app's functionality"; screenshots must "reflect your app's actual experience."

---

## 3. Google Play Console and Android platform requirements

### Target API level

Sources: https://support.google.com/googleplay/android-developer/answer/11926878 and https://developer.android.com/google/play/requirements/target-sdk

- Phone/tablet: "Android 16 (API level 36)" for new apps and app updates from "August 31, 2026"; "Developers will be able to request an extension to November 1, 2026."
- "New apps and app updates must target Android 16 (API level 36) or higher to be submitted to Google Play".
- → OK: our build targets **36** (Expo SDK 58 default, `VERSIONS.md`).

### 16 KB page size

Source: https://developer.android.com/guide/practices/page-sizes (last updated 2026-10-16)

- "all apps targeting Android 15 (API level 35) and higher must support 16 KB memory page sizes on 64-bit devices on Google Play. Starting February 1, 2027, if your app updates don't support 16 KB memory page sizes, you won't be able to release these updates." (The page gives no separate date for new apps; the Play Console shows a compatibility warning.)
- "If you update your tools to the latest versions (AGP version 8.5.1 or higher and NDK version r28 or higher) and use 16 KB-compatible prebuilt dependencies, then your app is 16 KB compatible by default". "NDK version r28 and higher compile 16 KB-aligned by default."
- Check: `check_elf_alignment.sh APK_NAME.apk` outputs "ALIGNED" or "UNALIGNED" per arm64-v8a library; `zipalign -c -P 16 -v 4 APK_NAME.apk`; for an AAB `bundletool dump config --bundle=<my .aab> | grep alignment` → `PAGE_ALIGNMENT_16K`.
- → CHECK (Stage 1.7): our build uses AGP 9.2.1 but **NDK r27.1** (both the React Native catalog and the EAS image), which is below the "r28 by default" line; prebuilt libraries (Hermes, Reanimated/Worklets, Lottie, Sentry, expo-image) must be checked one by one on the release build.

### Android 16 behavior changes (apps targeting API 36)

Source: https://developer.android.com/about/versions/16/behavior-changes-16

- Edge-to-edge: "For apps targeting Android 16 (API level 36), R.attr#windowOptOutEdgeToEdgeEnforcement is deprecated and disabled, and your app can't opt-out of going edge-to-edge." → OK: `edgeToEdgeEnabled=true` in gradle.properties; CHECK every screen (Stage 1.6).
- Large screens: "orientation, resizability, and aspect ratio restrictions no longer apply on displays with smallest width >= 600dp. Apps fill the entire display window, regardless of aspect ratio or a user's preferred orientation" → CHECK: `orientation: 'portrait'` is ignored on tablets/foldables; layouts must survive landscape (Stage 1.6).
- Predictive back: "predictive back system animations ... are enabled by default. Additionally, onBackPressed is not called and KeyEvent.KEYCODE_BACK is not dispatched anymore." → `predictiveBackGestureEnabled: false` in `app.config.ts` sets the manifest opt-out ("Migration or opt-out required"). CHECK the back gesture on every screen, modals, the date picker.
- App-owned photos: on Android 16 with target 36, the photo picker pre-selects photos the app owns. Informational (we own none).

### Android vitals

Source: https://developer.android.com/topic/performance/vitals

- "BAD BEHAVIOR THRESHOLD ... User-perceived crash rate 1.09% overall, 8% per phone model. User-perceived ANR rate 0.47% overall, 8% per phone model." "If your app or game exceeds a bad behavior threshold, Play may reduce the visibility of your title. Play may also show users a warning on your store listing."

### Notification permission (Android 13+)

Source: https://developer.android.com/develop/ui/views/notifications/notification-permission

- "Before you ask users to grant any permissions, let them familiarize themselves with your app." "When you request notification permissions within your app, do so in the correct context, so that it's explicitly clear what the notifications are used for and why the user should opt in." "If a user installs your app on a device that runs Android 13 or higher, your app's notifications are off by default." "If your app targets Android 13 or higher, your app has complete control over when the permission dialog is displayed."
- → OK: `askPushAfterApply` asks once after the first application, or from Settings; never on first launch. CHECK on device.

### App access (sign-in details for reviewers)

Source: https://support.google.com/googleplay/android-developer/answer/9859455

- For apps restricted by login "you must provide all required details to enable access to your app." Use "Any other instructions" for one-time passwords, multi-factor authentication, logins with more than two fields. Up to five sets of instructions. → Stage 4.7: demo account + "sign-up needs an Indian mobile number for OTP".

### Content rating (IARC)

Source: https://support.google.com/googleplay/android-developer/answer/9859655

- "To receive a rating for each of your apps and games, fill out a rating questionnaire in Google Play Console." Required for "New apps submitted to Google Play Console". "Misrepresentation of your app's content may result in its removal or suspension." Redo it for "All app updates where there has been a change to your content or features".

### Target audience and content

Source: https://support.google.com/googleplay/android-developer/answer/9867159

- "Select the age group(s) that your app targets." "If your app is only suitable or designed for an adult audience, you can enable the Restrict Minor Access feature." "To enable the Restrict Minor Access feature, select 18 and over as your app's only target age group." "Any apps that include children in their target audience must comply with Google Play's Families Policy Requirements." → Stage 4.3: 18 and over only.

### Testing tracks, review times, pre-launch report, production access

Sources: https://support.google.com/googleplay/android-developer/answer/9845334, .../answer/9859751, .../answer/9842757, .../answer/14151465

- Internal testing: "quickly distribute your app to up to 100 testers"; "First-time app uploads are available immediately to internal testers." "Internal tests might not be subject to standard Play policy or security reviews."
- Review time: "For certain developer accounts, we'll take more time to thoroughly review your app ... This may result in review times of up to seven days or longer in exceptional cases."
- Pre-launch report: "automatically generated when you upload an app bundle or APK" "Where capacity permits"; tests "Stability issues, Android compatibility issues, Performance issues, Accessibility issues"; credentials under Test and release > Testing > Pre-launch report > Settings; "create a test account username and password".
- Production access for new accounts: "personal developer accounts created after November 13, 2023" need "a minimum of 12 testers who have been opted in continuously for at least 14 days" before applying for production. **Does not apply to organisation accounts.** → CLIENT: the Play account must be an **organisation** account (D7), otherwise add 14 days + 12 testers to the plan.

### Store listing assets

Sources: https://support.google.com/googleplay/android-developer/answer/9866151 and the Store Listing policy above

- Icon "32-bit PNG (with alpha)", "512px by 512px", max 1024KB. Feature graphic "JPEG or 24-bit PNG (no alpha)", "1024px by 500px".
- Screenshots: "You must provide a minimum of two screenshots across different device types", "up to 8 screenshots for each supported device type", "JPEG or 24-bit PNG (no alpha)", "Minimum dimension: 320px", "Maximum dimension: 3840px", "The maximum dimension of your screenshot can't be more than twice as long as the minimum dimension." Short description 80 characters.
- **Disagreement:** Expo's store-assets guide says "You need to upload at least four screenshots to publish your app" (4 to 10, 9:16). Google's page says minimum two, maximum eight per device type. **We follow Google** (and will upload 4 to 8 phone screenshots, which satisfies both).

### App bundle, Play App Signing

Sources: https://docs.expo.dev/submit/android/ (modified 2026-10-09), https://support.google.com/googleplay/android-developer/answer/9842756

- "You need a production .aab (Android App Bundle) to submit." "Google Play requires new apps to be published as app bundles instead of .apk files." → OK: the `production` EAS profile has no `buildType: apk`, so it builds an AAB.
- "If this is your app's first submission, the default eas submit command works out of the box and creates your app's first release on the internal testing track." → needs a Google Service Account key (RAJ, after the Play account exists). `eas submit` only with Raj's OK (CLAUDE.md).
- Play App Signing: "Google uses this key to sign the final APKs delivered to users' devices." Fingerprint for `assetlinks.json`: Play Console → Play app signing → "App signing key" section; "Update your assetlinks.json file with these fingerprints if you use Android App Links." (matches `docs/store/README.md`).

---

## 4. Expo (SDK 58)

- SDK 58 (https://docs.expo.dev/versions/v58.0.0/, read 2026-10-31): minimum Android 7+, minimum iOS **16.4+**, Xcode 26.4+, React Native 0.88, React 19.3.0, Node 22.13+. Android table row for SDK 58: compileSdkVersion **37**, targetSdkVersion **36**.
- SDK 58 changelog (https://expo.dev/changelog/sdk-58, "October 15, 2026"): "SDK 58 upgrades React Native from 0.86 to 0.88"; "SDK 58 is built for iOS 27"; Expo Router "no longer carries most of the forked React Navigation API" (matches CLAUDE.md: Expo Router APIs only). Note: `docs/DECISIONS.md` D9 says SDK 58.0.0 was released 2026-09-29; the changelog page says October 15, 2026. Not important for the stores.
- EAS build images (https://docs.expo.dev/build-reference/infrastructure/): iOS `macos-tahoe-26.6-xcode-27.1` ("Xcode 27.1 RC (27A9275)", macOS 26.6.2) is both `latest` and `sdk-58`; Android `ubuntu-26.04-jdk-17-ndk-r27b-sdk-58` ("NDK 27.1.12297006", "Java 17"). → Apple's Xcode 26 rule is met.
- Submit iOS (https://docs.expo.dev/submit/ios/): "A paid Apple Developer account is required to submit apps to the Apple App Store." `ascAppId` from App Store Connect; an App Store Connect API key (`eas credentials --platform ios`) is the path for EAS. "The build appears in TestFlight after processing (usually 10-15 minutes)."
- Notifications (https://docs.expo.dev/versions/v58.0.0/sdk/notifications/): on Android 13 "app users must opt-in to receive notifications via a permissions prompt" and the prompt "will not appear until at least one notification channel is created" (we create `default` before asking). Push needs credentials: FCM (`google-services.json`, RAJ) and an APNs key (CLIENT's Apple account).
- App config (https://docs.expo.dev/versions/v58.0.0/config/app/): `ios.supportsTablet` "Defaults to false"; `android.predictiveBackGestureEnabled` "Default to false"; `android.blockedPermissions` "List of permissions to block in the final AndroidManifest.xml."; `updates.checkAutomatically` "By default, expo-updates will check for updates every time the app is loaded."
- Build properties (https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/): `usesCleartextTraffic` "For Android 9 and above, the default platform-specific value is false." `ios.deploymentTarget` under build-properties is "Deprecated: use built-in ios.deploymentTarget property instead (SDK 56 and greater)."
- EAS Update (https://docs.expo.dev/eas-update/introduction/): "One of the rules of EAS Update is that you need to follow the rules of the platforms and app stores you are building for." "This usually means changes to your app's behavior need to be reviewed." Native changes need "a new app binary version".

---

## 5. What the app sends off the phone (for sections 1 and 2; to be proven from real traffic in Stage 4.1)

| Goes to | What | Why | Declared as |
| --- | --- | --- | --- |
| Our backend (Render, production `job-ojsr.onrender.com`) | account, profile, CV, documents, photos, applications, saved jobs, push token, app version header | the service | Google: all the Personal info / Files / Photos / App activity / Device IDs types. Apple: Contact Info, User Content, Identifiers (linked to the user). |
| Cloudinary (through the backend) | profile photo, CV, documents | storage | processor of ours; covered by the backend row |
| Sentry | crash and error events, device model/OS, app version; emails/phones scrubbed; `sendDefaultPii: false` | crash reporting | Google: App info and performance (crash logs, diagnostics). Apple: Diagnostics (Crash Data, Performance Data, Other Diagnostic Data), not linked, no tracking. CHECK the real event. |
| Expo push service | Expo push token (from the backend, PR 7) | push delivery | Device or other IDs |
| Expo updates server (`u.expo.dev`) | runtime version, platform, update id; no personal data | OTA updates | nothing personal; mention in the policy |
| Firebase Cloud Messaging / APNs | device push registration | push transport | Device ID |

No ads, no analytics SDK, no location, no contacts, no microphone, no payments, no health data, no tracking.
