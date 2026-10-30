# Store listing drafts (Stage 4.4)

Describes only what the build does today. For the client to approve (BLOCKERS B6). Rules: Google title ≤ 30
characters, short description ≤ 80, full description ≤ 4000, no ranking/price words, no emoji; Apple name ≤ 30,
subtitle ≤ 30, promotional text ≤ 170, description ≤ 4000, keywords ≤ 100 characters (comma-separated).

## Shared facts

| Item | Value | Status |
| --- | --- | --- |
| App name | **ApronHanger** (11 characters) | from `app.config.ts` |
| Developer / seller | APRONHANGER PRIVATE LIMITED (the name on the privacy policy) | client to confirm |
| Category | Google: **Business**. Apple primary: **Business**, secondary: none (Apple has no "Jobs" category) | client to confirm |
| Privacy policy URL | https://apronhanger.work/privacy-policy.html | live |
| Support URL | **missing**: needs a page on apronhanger.work with the support email and phone (B3, B4) | blocked |
| Marketing URL (optional) | https://apronhanger.work | |
| Support email (Play "contact details") | the privacy policy says `support@apronhanger.org`; backend PR 5's deletion page says `support@apronhanger.work`. **Client must pick one** (B4) | blocked |
| Copyright | © 2026 APRONHANGER PRIVATE LIMITED | client to confirm |
| Package / bundle id | work.apronhanger.candidate | locked (D2) |
| Website | https://apronhanger.work | |

## Google Play

**Title (30 max):** `ApronHanger – Healthcare Jobs` (29) — alternative: `ApronHanger: Hospital Jobs` (26)

**Short description (80 max):** `Find hospital jobs in India, build your CV and apply in one tap.` (64)

**Full description:**

```
ApronHanger is the candidate app of apronhanger.work, the job portal for healthcare professionals in India: nurses, doctors, paramedics, technicians and hospital staff.

Find the right job
• Browse jobs posted by hospitals, with role, specialty, city, experience and salary filters
• Search by role, specialty or city
• See how well your profile matches a job
• Save jobs to come back to later
• Government job and exam notifications, and international openings, with links to the official source

Build your profile once
• A step-by-step profile builder with your qualifications, registration, experience, skills and documents
• Your CV is generated from it; preview, download or share it as a PDF
• Keep certificates and documents in your document vault

Apply and follow up
• Quick Apply with your saved profile, or apply with your own CV
• Answer the hospital's questions in the app
• Track every application: applied, shortlisted, interview, documents requested, offer, joining
• Accept, decline or ask to reschedule an interview; upload requested documents; open and accept an offer letter
• Get a notification when a hospital replies (optional)

Your account, your data
• Sign up with your mobile number (OTP) and email
• Delete your account from Settings at any time

ApronHanger is not a government app and is not affiliated with any government body. Government listings are collected from public notifications; always apply through the official website of the authority.

Privacy policy: https://apronhanger.work/privacy-policy.html
```

(about 1,500 characters)

## Apple App Store

**Name (30 max):** `ApronHanger` · **Subtitle (30 max):** `Healthcare jobs in India` (24)

**Promotional text (170 max, can change without a build):** `Hospital jobs for nurses, doctors and healthcare staff. Build your profile once, apply in one tap and track every application.` (124)

**Description:** same text as the Google full description.

**Keywords (100 max):** `nursing jobs,hospital jobs,doctor jobs,healthcare,nurse,medical jobs,staff nurse,paramedic,india` (96)

**What's New (1.0):** `First release of the ApronHanger candidate app.`

**Support URL:** blocked (see shared facts). **Marketing URL:** https://apronhanger.work

**App Review notes:** see `REVIEW-NOTES.md`.

## Not to claim anywhere

No "1.2L+ professionals" or similar numbers from the website unless the client can substantiate them (Google: metadata must be accurate; Apple 2.3). No "official", "government", "verified" wording about the app itself. No iPad screenshots (iPhone-only build).
