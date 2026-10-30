# Google Play Data safety form: draft answers (Stage 4.2)

Answered on Google's terms (https://support.google.com/googleplay/android-developer/answer/10787469, read 2026-10-31).
Source of the facts: `DATA-INVENTORY.md`. To be confirmed from the release-build traffic and approved by the client.

## Overview questions

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only in the production build) |
| Do you provide a way for users to request that their data is deleted? | **Yes**. In-app: Profile → Settings → Delete account. Web: `https://apronhanger.work/delete-account.html` (must be live: today the URL returns the website's index page, see BLOCKERS B3) |
| Privacy policy URL | `https://apronhanger.work/privacy-policy.html` (live, last updated 12/09/2026; must be extended, BLOCKERS B4) |
| Independent security review | No |

## Data types

"Collected" = sent to our servers. Nothing is "shared" with third parties in Google's sense: Render, Neon, Cloudinary, Sentry and Expo are service providers processing on our behalf. "Ephemeral" = No for everything below (it is stored).

| Category | Type | Collected | Shared | Required or optional | Purpose |
| --- | --- | --- | --- | --- | --- |
| Personal info | Name | Yes | No | Required (account) | App functionality, Account management |
| Personal info | Email address | Yes | No | Required | App functionality, Account management |
| Personal info | Phone number | Yes | No | Required (OTP sign-up) | App functionality, Account management |
| Personal info | Address (city, state, preferred locations) | Yes | No | Optional (profile) | App functionality |
| Personal info | Other info (role, specialty, experience, registration number, education, certifications, work history, salary, notice period) | Yes | No | Optional (profile) | App functionality |
| Photos and videos | Photos (profile photo, photographed documents) | Yes | No | Optional | App functionality |
| Files and docs | CV, certificates and other documents | Yes | No | Optional | App functionality |
| App activity | Other user-generated content (answers to job questions, reasons typed for interview changes) | Yes | No | Optional | App functionality |
| App activity | Other actions (saved jobs, applications, notification read state, search text) | Yes | No | Required | App functionality |
| App info and performance | Crash logs | Yes | No | Required (automatic) | Analytics (diagnostics) |
| App info and performance | Diagnostics | Yes | No | Required (automatic) | Analytics (diagnostics) |
| Device or other IDs | Push notification token | Yes | No | Optional (only after the user turns notifications on) | App functionality |

Not collected: Location, Financial info, Health and fitness, Messages, Audio, Calendar, Contacts, Web browsing history, advertising ID.

## Data handling

- Account deletion deletes: everything in the Personal info, Photos, Files, App activity and Device ID rows above (section 1 of `ACCOUNT-DELETION-DATA.md`).
- Kept after deletion, to be named in the privacy policy: application records held for the hospitals (status, dates, the hospital's own notes, interview history, offer letter), an anonymous audit entry, backups for their retention period (sections 3 and 4 of `ACCOUNT-DELETION-DATA.md`).
- Crash logs: not linked to an account; emails and phone numbers are scrubbed on the phone before sending.

## Also on the App content page

- **Ads:** No, the app contains no ads.
- **App access:** restricted by login → provide the demo account (see `REVIEW-NOTES.md`), with the note that sign-up needs an Indian mobile number for OTP.
- **Target audience:** 18 and over only; enable "Restrict Minor Access".
- **Government apps:** No, this is not a government app (declaration appears for some categories).
- **Health apps:** No.
- **Financial features:** No.
- **News apps:** No.
- **Content rating:** see `RATINGS.md`.
