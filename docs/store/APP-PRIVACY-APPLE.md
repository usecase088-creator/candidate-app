# Apple App Privacy ("nutrition label"): draft answers (Stage 4.2)

Answered on Apple's terms (https://developer.apple.com/app-store/app-privacy-details/, read 2026-10-31). Not copied from
the Google form. To be confirmed from the release-build traffic and approved by the client. Role needed in App Store
Connect to enter it: Account Holder, Admin or App Manager.

## First question

"Do you or your third-party partners collect data from this app?" → **Yes, we collect data from this app.**

## Data types

For each type Apple asks: is it linked to the user's identity, is it used for tracking, and the purposes.
Tracking = **No** for everything (no advertising, no data brokers, no cross-app linking).

| Apple category | Data type | Linked to user | Purposes |
| --- | --- | --- | --- |
| Contact Info | Name | Yes | App Functionality |
| Contact Info | Email Address | Yes | App Functionality |
| Contact Info | Phone Number | Yes | App Functionality |
| Contact Info | Physical Address (city, state, preferred locations) | Yes | App Functionality |
| User Content | Photos or Videos (profile photo, document photos) | Yes | App Functionality |
| User Content | Other User Content (CV, documents, profile text, answers to job questions) | Yes | App Functionality |
| Identifiers | User ID (account id) | Yes | App Functionality |
| Identifiers | Device ID (push token; only once notifications are turned on) | Yes | App Functionality |
| Usage Data | Product Interaction (saved jobs, applications, search text sent to the server) | Yes | App Functionality |
| Diagnostics | Crash Data (Sentry) | **No** | App Functionality |
| Diagnostics | Performance Data (Sentry) | **No** | App Functionality |
| Diagnostics | Other Diagnostic Data (Sentry: API error kind, status, path) | **No** | App Functionality |

Not collected: Health & Fitness, Financial Info, Location, Sensitive Info, Contacts, Browsing History, Search History (the search text is sent for the request only; declare under Product Interaction if Apple's reviewer asks), Purchases, Audio, Gameplay, Customer Support, Advertising Data, Other Data.

"Diagnostics not linked" holds only if the real Sentry event carries no user id, email, phone, name or IP: `sendDefaultPii: false` and the scrubber are in the code; check one real event from the production build before publishing the label.

## Privacy links

- Privacy Policy URL (required): `https://apronhanger.work/privacy-policy.html`
- User Privacy Choices URL (optional): none.

## App Store Connect "App Information" items that go with this

- Age rating: see `RATINGS.md`.
- Export compliance: `ITSAppUsesNonExemptEncryption = NO` in the build, so no question is asked per upload (client accepts the declaration, BLOCKERS B6).
- Content rights: the app shows job listings published by hospitals and public government notifications; the client owns the ApronHanger name and logo (5.2.1).
