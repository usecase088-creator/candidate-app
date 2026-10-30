# What happens to a candidate's data when they delete their account

For the privacy policy and the Google Play data-safety form ("Data deletion" section).
Source: backend branch `feat/delete-account` (PR 9), `backend/src/lib/accountDeletion.ts`, checked column by column
against `backend/prisma/schema.prisma` on 2026-10-30. **Valid only once PR 9 (and PR 7 / PR 8 for the token tables) are
deployed.** If the backend changes, check this list again (a backend test fails when a new Candidate or Application
column is added without a decision).

How to delete: in the app, Profile → Settings → Delete account (password asked again), or the public page
`delete-account.html` for people who no longer have the app. Deletion is immediate and cannot be undone.

## 1. Deleted at once

| Data | Where it was |
| --- | --- |
| Sign-in account: email, mobile number, name, full name, username, password (hash) | `User` row (deleted) |
| In-app notifications sent to the candidate | `InAppNotification` (deleted with the account) |
| Push notification tokens of the candidate's phones | `PushToken` (deleted with the account, PR 7) |
| Sign-in sessions (refresh tokens) | `RefreshToken` (deleted with the account, PR 8) |
| Saved jobs | `SavedJob` |
| Profile: name, initials, email, phone, role, specialty, experience, registration number and council, current employer, summary, location, languages, procedures, skills, education, certifications, work history, salary (current and expected), notice period, preferred locations, availability, the whole profile form, search text | `Candidate` row, emptied (see 2) |
| Profile picture, uploaded CV, document vault (files and their names) | `Candidate` row emptied; files removed from Cloudinary |
| From every application: the CV sent with it (file, name, type), answers to the job's questions, documents sent with it, the candidate's typed reason for declining or rescheduling an interview | `Application` columns emptied; files removed from Cloudinary |
| Documents the candidate uploaded when a hospital asked for them | `ApplicationDocument` rows uploaded by the candidate deleted; files removed from Cloudinary |
| Unfinished password-reset and sign-up requests for the candidate's mobile number (every stored format) | `ResetToken`, `OtpVerificationToken` |
| The candidate's name in the recruiters' in-app notifications about their applications ("<name> applied for <role>", "<name> has requested to reschedule / declined the interview / uploaded the requested documents / accepted / declined the offer / officially joined"): replaced by "Deleted candidate" | `InAppNotification` rows of the hospital's recruiters (the rest of the message stays) |
| On the phone: sign-in tokens, cached user, push token, profile-form draft and the files picked for it | SecureStore and the app's private folder, cleared when the app signs out after deletion |

Files are removed from Cloudinary right after the deletion. If Cloudinary is unreachable they are kept in a queue
(`CloudinaryCleanup`, file ids only, no names or contents) and retried every 30 minutes, up to 20 times; after that a
log line asks a person to remove them by hand.

## 2. Kept, without personal data

| Data | Why |
| --- | --- |
| `Candidate` row with name "Deleted candidate", email `deleted-<id>@deleted.invalid`, no phone, all profile fields empty; only its id, created/updated dates, suspended flag and deletion date remain | Applications must point at a candidate row (database rule). Hidden from search and admin lists. |
| One audit entry "candidate deleted (self_delete)" with the internal ids only | Proof that the deletion was asked for and done |

## 3. Kept, and may still contain the candidate's personal data

Tell users about these in the privacy policy ("information held by employers and in records we must keep").
Kept on purpose (Raj, 2026-10-30): the hospital's notes, the interview history and the offer letters are the
hospital's records.

| Data | What personal data it can hold | Where | How long |
| --- | --- | --- | --- |
| **Applications** (one per job applied to): job, status, dates (applied, reviewed, interview, offer, joining), interview type, venue, meeting link, interviewer's name and email, round, list of requested documents, flag | No name, email or phone of the candidate is copied onto the application. The application still says that this (now anonymous) candidate applied to that job. | `Application` | No end date (hospital's records) |
| **The hospital's notes** on each application: interview notes, interview outcome note, document request note, joining note, final status note | Free text typed by the hospital: may name or describe the candidate | `Application` | No end date (hospital's records) |
| **Interview history** (every scheduled and rescheduled slot: date, type, venue or link, interviewer) | Written by the hospital; may name the candidate in its notes | `Application.interviewHistory` | No end date (hospital's records) |
| **Offer letter** (PDF made by the hospital) | Very likely the candidate's name, and whatever the hospital wrote in it | Cloudinary file + link on the application | No end date (hospital's record) |
| **Documents a hospital added** to an application | Whatever the hospital uploaded | `ApplicationDocument` (uploaded by RECRUITER) + Cloudinary | No end date |
| **Recruiters' in-app notifications, in two cases only**: (a) on a job where another applicant has exactly the same name (the message cannot tell whose it is), (b) messages written under an older name the candidate used before renaming their profile | **The candidate's name** | `InAppNotification` rows of the hospital's recruiters | Until the recruiter account is deleted |
| **Admin impersonation log**, only if an administrator ever opened the account as the candidate (support) | **The sign-in email**, admin id, date | `ImpersonationLog.targetEmail`, `ActivityLog.meta` | No end date (audit) |
| **Push receipt queue** | The phone's push token (not a name, number or email) | `PushReceiptPending` (PR 7) | About 15 to 30 minutes, until the receipt is checked |

## 4. Outside the database

| Where | What | How long |
| --- | --- | --- |
| Neon database backups / point-in-time history, and any backup branch made by hand | Everything as it was before the deletion | Neon's history window of the plan in use; hand-made backup branches until someone deletes them (PR 9 asks for one before deploy: delete it after 30 days) |
| Render server logs | The email address of each email sent (for example the offer-letter email); account ids | Render's log retention of the plan in use |
| Brevo (email provider) | Emails already sent to the candidate (offer letter) and their delivery logs | Brevo's retention |
| Emails and in-app notifications already delivered to hospital staff | The candidate's name | Not under our control |
| Sentry (app crash reports) | No name, email, phone or files (scrubbed in the app before sending) | Sentry plan retention |

## 5. For the Google Play data-safety form

- "Does your app provide a way for users to request that their data is deleted?" **Yes**: in the app, and on the web
  page `delete-account.html` (link required by Google for users who uninstalled the app).
- Data that is deleted: personal info (name, email, phone, address/location), work history and other profile info,
  photos, files and documents, app activity (saved jobs, notifications), device IDs (push token).
- Data that is kept, to be named in the policy: application records held for the hospitals (status, dates, the
  hospital's own notes, interview history, offer letter), recruiter notifications in the two same-name / old-name
  cases of section 3, an anonymous audit entry, backups for their retention period.

## Decided by Raj (2026-10-30), built in PR 9's second commit

- Recruiter notifications: the candidate's name is replaced by "Deleted candidate" at deletion (limits in section 3).
- Unfinished reset / sign-up requests of the candidate's mobile number are deleted at deletion.
- Hospital notes, interview history and offer letters are kept (section 3).
Not tested against a real database yet: check on staging before production.
