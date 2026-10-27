# API reference (candidate website ↔ backend)

Source: `apronhanger/job`, branch `conflict-resolution1`, commit `3fa6885` (2026-10-08).
Every fact below was read from the code. Paths are relative to `../job`.
`B:` = backend file:line. `W:` = candidate website file:line that calls it.

## Global behaviour

- **Base URL**: website uses `VITE_API_BASE` (`candidates/src/lib/api.ts:6`). Backend runs on Render
  (free tier: cold start, so the website shows "Server is warming up..." after 2 s, `routes/__root.tsx:85`).
- **Body**: JSON, limit **5 MB** (`B: index.ts:83`). Uploads are `multipart/form-data`.
- **Auth header**: `Authorization: Bearer <JWT>`. No cookies.
- **JWT**: HS256 with `JWT_SECRET`, `expiresIn: '15d'`, payload
  `{ id, email, name, role, hospitalId, candidateId, tokenVersion }` (`B: routes/authRoutes.ts:216, 267`).
  No refresh token.
- **`requireAuth`** (`B: middleware/auth.ts:41`) looks up the user on **every** request:
  | Case | Status | `error` |
  | --- | --- | --- |
  | No `Bearer` header | 401 | `Unauthorized` |
  | User row gone | 401 | `User not found` |
  | `tokenVersion` changed (password reset) | 401 | `Session invalidated. Please log in again.` |
  | Bad/expired JWT | 401 | `Invalid or expired token` |
  | User suspended | 403 | `Your account has been suspended. Contact support.` |
  | User soft-deleted | 403 | `Account not found.` |
  | Hospital suspended/deleted (recruiters) | 403 | `Your hospital account has been suspended or deleted.` |
- **`requireRole('CANDIDATE')`** → 403 `Forbidden` for other roles (`B: middleware/auth.ts:92`).
- **Error shape**: always `{ "error": string }` (a few add `code`). Unhandled errors → 500
  `{ "error": "Internal Server Error" }` (`B: index.ts:237`).
- **Website 401 handling** (`W: lib/api.ts:23`): on 401 from any URL **not containing `/auth`**, if a token
  exists → clear token, user and cached profile, then go to `/auth?redirect=<path>`.
- **CORS** (`B: lib/corsConfig.ts`): requests **without** `Origin` are allowed (native app is fine).
  Browser origins must be in `ALLOWED_ORIGINS_CANDIDATE` etc. A rejected origin goes to the global error
  handler → **500**, not 403. Expo web on `http://localhost:8081` must be in the list for the local backend.
- **Health**: `GET /health` → `{ status: 'ok', db: 'ok' }` or 503 `{ status: 'error', db: 'unreachable' }` (`B: index.ts:161`).

## Rate limiters (`B: index.ts:86-148, 190-234`)

All are `express-rate-limit` with the default key = **client IP** (`trust proxy` = 1). Response is **429**
with the JSON `message` below plus `RateLimit-*` headers. **One limiter instance is shared by every path it is
mounted on**, so the counts add up across those paths for the same IP.

| Limiter | Window | Max | 429 `error` | Mounted on |
| --- | --- | --- | --- | --- |
| `authLimiter` | 15 min | 20 | `Too many login attempts, please try again after 15 minutes` | `/api/auth/login`, `/api/auth/register`, `/api/admin/auth/login` |
| `otpLimiter` | 15 min | **5** | `Too many OTP requests, please try again after 15 minutes` | `/api/auth/signup/send-otp`, `/signup/verify-otp`, `/forgot-password`, `/verify-otp`, `/reset-password`, `/resend-otp`, `/api/onboarding/verify-mobile`, `/api/onboarding/resend-otp` |
| `searchLimiter` | 15 min | 150 | `Too many search requests, please try again later` | `/api/candidates/*`, `/api/search/*` |
| `publicJobsLimiter` | 15 min | 100 | `Too many job requests. Please try again later.` | `/api/jobs/*` |
| `uploadLimiter` | 15 min | 30 | `Upload limit reached, please try again later` | `/api/upload/*` |
| none | – | – | – | `/api/applications`, `/api/saved-jobs`, `/api/notifications`, `/api/gov-jobs`, `/api/intl-jobs` |

`/api/candidates/me` (profile load **and** save) uses `searchLimiter`.

---

## Endpoints the candidate website calls (28)

### Auth

#### 1. `POST /api/auth/login` — B: `routes/authRoutes.ts:233` · W: `routes/auth.tsx:150`
- Auth: none. Limiter: `authLimiter`.
- Body: `{ email, password }`. Email is matched exactly (no lowercasing, no trim).
- 200: `{ token, user: { id, email, name, role, hospitalId, candidateId } }`. `role` is `CANDIDATE` or
  `RECRUITER` (admins are a separate table and cannot log in here). `candidateId` is null for recruiters.
- Errors: 400 `email and password are required` · 401 `Invalid email or password` (unknown email, wrong
  password **or** soft-deleted) · 403 `Your account has been suspended. Please contact support.` · 500 `Login failed`.
- Website maps errors with `loginErrorMessage` (`W: lib/authMessages.ts:16`), so the **403 suspended
  message is shown as is**, but 401 becomes `Invalid email or password. Please try again.`

#### 2. `POST /api/auth/signup/send-otp` — B: `authRoutes.ts:41` · W: `auth.tsx:128`
- Auth: none. Limiter: `otpLimiter`.
- Body: `{ mobile, role: "CANDIDATE" }`. `mobile` is sent **as typed** (website does not normalise).
- 200 (always, even if not sent): `{ message: 'If this number is eligible for signup, an OTP has been sent.' }`.
  If the mobile is already registered for this role, **no SMS is sent** but the response is the same.
- Errors: 400 `mobile and role are required` · 400 `role must be RECRUITER or CANDIDATE` ·
  Fast2SMS 4xx → that status + Fast2SMS message · 5xx → `Failed to send OTP. Please try again.`
- OTP is generated, sent **and stored by Fast2SMS** (`B: lib/otp.ts`): 6 digits, 10 min expiry. Backend never sees the code.

#### 3. `POST /api/auth/signup/verify-otp` — B: `authRoutes.ts:66` · W: `auth.tsx:212`
- Auth: none. Limiter: `otpLimiter`.
- Body: `{ mobile, otp, role: "CANDIDATE" }`.
- 200: `{ message: 'OTP verified', signup_token }`. `signup_token` = 64 hex chars, stored in DB table
  `OtpVerificationToken`, valid **15 min**, bound to the exact `mobile` string and role.
- Errors: 400 `mobile, otp, and role are required` · 400 `role must be ...` ·
  **any** failure (wrong, expired, already registered) → 400 `Invalid or expired OTP`.

#### 4. `POST /api/auth/register` — B: `authRoutes.ts:94` · W: `auth.tsx:225`
- Auth: none. Limiter: `authLimiter`.
- Body: `{ email, password, name, mobile, role: "CANDIDATE", signup_token }`. `mobile` must be the **same
  string** used in verify-otp.
- 201: `{ token, user: { id, email, name, role, hospitalId: undefined, candidateId } }` (user is logged in).
  Creates `User` + `Candidate` (`initials` from name).
- Errors (400 unless stated):
  `email, password, name, mobile, role, and signup_token are required` ·
  `role must be CANDIDATE or RECRUITER` ·
  `Input fields exceed maximum allowed length` (email > 255, password > 128, name > 100, mobile > 20) ·
  `Password must be at least 8 characters long` · `Password must contain at least one uppercase letter` ·
  `... one lowercase letter` · `... one special character` ·
  `Mobile verification is required before registration` (bad/expired/mismatched token) ·
  409 `Email is already registered` · 409 `Mobile number is already registered for this role` · 500 `Registration failed`.

#### 5. `POST /api/auth/forgot-password` — B: `authRoutes.ts:396` · W: `auth_.forgot-password.tsx:40`
- Auth: none. Limiter: `otpLimiter`.
- Body: `{ mobile, role: "CANDIDATE" }`. Lookup tries `mobile`, `+91mobile`, `+91 mobile`, `XXXXX XXXXX`,
  `+91 XXXXX XXXXX` and the raw input (`findUserByMobile`, `authRoutes.ts:23`).
- 200 (always): `{ message: 'If an account exists for this number, an OTP has been sent.' }`.
  SMS goes to the **stored** `user.mobile` with the reset template.
- Errors: 400 `mobile and role are required` · 400 `role must be RECRUITER or CANDIDATE` · 500 `Failed to send OTP. Please try again.`

#### 6. `POST /api/auth/verify-otp` — B: `authRoutes.ts:420` · W: `auth_.forgot-password.tsx:67`
- Auth: none. Limiter: `otpLimiter`.
- Body: `{ mobile, otp, role: "CANDIDATE" }`.
- 200: `{ message: 'OTP verified', reset_token, maskedEmail }`. `reset_token` (DB table `ResetToken`) valid **15 min**.
  `maskedEmail` = first char + `***` + last char of the local part + `@domain` (`a***z@x.com`); if local part ≤ 2 chars: `ab***@x.com`.
- Errors: 400 `mobile, otp, and role are required` · 400 `role must be ...` · 400 `Invalid or expired OTP`
  (no such account) · OTP failure → Fast2SMS status (404 mapped to 400) with the **raw Fast2SMS message**.

#### 7. `POST /api/auth/reset-password` — B: `authRoutes.ts:461` · W: `auth_.forgot-password.tsx:112`
- Auth: none. Limiter: `otpLimiter`.
- Body: `{ reset_token, new_password, role: "CANDIDATE" }`.
- 200: `{ message: 'Password reset successfully' }`. Increments `tokenVersion`, so **all existing JWTs for that
  user stop working** (401 `Session invalidated. Please log in again.`).
- Errors (400): `reset_token, new_password, and role are required` · `Password must be at least 8 characters` ·
  `Password must contain at least one uppercase letter` / `lowercase letter` / `special character` ·
  `role must be RECRUITER or CANDIDATE` · `Invalid or expired reset token` · 500 `Password reset failed. Please try again.`
- Note: the reset token is not deleted when it expires unless it is used again; it is deleted after success.

### Candidate profile

#### 8. `GET /api/candidates/me` — B: `routes/candidateRoutes.ts:378` · W: `lib/hydrate.ts:26`
- Auth: CANDIDATE. Limiter: `searchLimiter`.
- 200: the `Candidate` row spread through `formatCandidate` (`B: lib/helpers.ts:184`) **plus** `applications`
  (raw rows). Key fields: `id, name, initials, role, specialty, experienceYears, location, email, phone,
  summary, verified, cvSource ("form"|"upload"|null), cvUrl, cvCloudinaryId, uploadedCvName, uploadedCvMime,
  avatarUrl, avatarCloudinaryId, profile (parsed profileJson or null), skills[], languages[], procedures[],
  education[], certifications[], experience[], preferredLocations[], supportingDocuments[], expectedSalaryMin/Max,
  currentSalaryMin/Max, noticePeriod, availabilityStatus, createdAt, updatedAt`. Also contains internal
  fields (`searchBlob`, `userId`, ...) that the app ignores.
- Errors: 404 `No candidate profile linked to your account` · 404 `Candidate profile not found` · 500 `Internal server error`.
- **This is how the website restores a session** (not `/api/auth/me`).

#### 9. `PUT /api/candidates/me` — B: `candidateRoutes.ts:401` · W: `lib/applications.ts:60`
- Auth: CANDIDATE. Limiter: `searchLimiter`.
- Body used by the website: `{ profile, cvUrl?, cvCloudinaryId?, cvName?, cvMime?, supportingDocuments? }`.
  With `profile`, `syncFormProfile` (`B: lib/helpers.ts:249`) rewrites the candidate from the form (contact data side effects: see `docs/client/`, local only).
- 200: same shape as GET.
- Errors: 400 `No candidate profile linked to your account` · 400 `CV does not belong to your account.` /
  `Invalid CV URL.` · 500 `Failed to update candidate profile`.

### Jobs

#### 10. `GET /api/jobs` — B: `routes/jobRoutes.ts:170` · W: `routes/index.tsx:61`, `routes/jobs.$jobId.tsx:31`
- Auth: optional. If a valid candidate JWT is sent, each job gets `matchPercent` (52–98). Limiter: `publicJobsLimiter`.
- Query: `q` (case-**sensitive** `contains` on role/specialty/location, Postgres), `category`, `excludeId`,
  `limit` (1–20, only when given; default **50**), `hospitalId`.
- Filters: `status = 'Active'`, visibility not ended, hospital not suspended/deleted, then hospitals with an
  expired plan are removed **after** the 50-row query (so fewer than 50 can come back). Order: `postedOn desc`.
  No paging.
- 200: **bare array** of `formatJob` (`B: lib/helpers.ts:540`):
  `{ id, role, category, specialty, subSpecialty, location, city, salaryMin, salaryMax (LPA), experienceMin,
  experienceMax, experience, type, shift, status, closedReason, postedDays, postedOn, createdAt, updatedAt,
  visibilityEndsAt, description (may be HTML), responsibilities[], requirements[], perks[], tags[], isFlagged,
  customApplicationFields[], hospitalId, hospital (name string), hospitalLogoUrl, hospitalVerified,
  hospitalAbout, postedById, postedBy {id, name, email}, applicants, shortlisted, matchPercent? }`.
- Website does **not** use `q`; it fetches all and filters on the device (`W: lib/jobSearch.ts`).
- Errors: 500 `Internal server error`.

#### 11. `GET /api/jobs/:id` — B: `jobRoutes.ts:258` · W: `routes/jobs.$jobId.tsx:23`, `routes/apply.$jobId.tsx:13`
- Auth: optional (adds `matchPercent`). Limiter: `publicJobsLimiter`.
- 200: one `formatJob`, `postedBy.email` removed for the public.
- Errors: 404 `Job not found` (missing, hospital suspended, plan expired, or status ≠ Active) · 500.

#### 12. `GET /api/gov-jobs` — B: `routes/govJobRoutes.ts:7` · W: `routes/gov-jobs.tsx:73`, `components/home/GovJobsFilmReel.tsx:76`
- Auth: none (website sends the token anyway). No limiter. No paging (returns **all** rows).
- 200: `[{ id, examAuthority, name, lastDate (ISO|null), link, createdAt }]`, newest first.
- Errors: 500 `Failed to fetch government jobs`.

#### 13. `GET /api/intl-jobs` — B: `routes/intlJobRoutes.ts:7` · W: `routes/foreign-jobs.tsx:100`
- Auth: none. No limiter. No paging.
- 200: `[{ id, jobPosition, specialty, city, country, countryFlag (emoji), payscale, experience, qualification,
  license, visaSponsorship, applyLink, lastDate|null, createdAt }]`, newest first.
- Errors: 500 `Failed to fetch international jobs`.

### Saved jobs

#### 14. `GET /api/saved-jobs` — B: `routes/savedJobRoutes.ts:10` · W: `lib/savedJobs.ts:7,14`, `routes/saved-jobs.tsx:22`
- Auth: CANDIDATE. No limiter.
- 200: `[{ savedAt, job: formatJob }]`, newest first. Since the hotfix (PR 1, live 2026-10-26, commit `5b569f1`) each
  `job` carries only the applicant count (`applicants`), **no** `applications` list; `postedBy` is not included.
  Before the hotfix it carried every application row of the job (see notes).
- Errors: 400 `No candidate profile linked` · 500.

#### 15. `POST /api/saved-jobs` — B: `savedJobRoutes.ts:33` · W: `lib/savedJobs.ts:22`
- Body: `{ jobId }`. 201: `{ savedAt, job }`.
- Errors: 400 `candidateId and jobId are required` · 409 `Job already saved` · 500 (also for an unknown `jobId`).

#### 16. `DELETE /api/saved-jobs/:jobId` — B: `savedJobRoutes.ts:57` · W: `lib/savedJobs.ts:34`
- 200: `{ success: true }`. Errors: 400 `No candidate profile linked` · 404 `Saved job not found` · 500.

### Applications

#### 17. `GET /api/applications` — B: `routes/applicationRoutes.ts:233` · W: `routes/applications.tsx:129`, `routes/apply.$jobId.tsx:15`, `lib/applications.ts:16,178`
- Auth: any user (CANDIDATE sees own). No limiter.
- Query: none used by the website → **bare array**, max **50**, `appliedOn desc`. With `?page=` it returns
  `{ data, total, page, limit, totalPages }` instead.
- 200 item (`formatApp`, `B: lib/helpers.ts:564`): all `Application` columns
  (`status, appliedOn, interviewDate, interviewType, meetingLink, venue, interviewerName, interviewerEmail,
  interviewNotes, interviewRound, candidateResponseNote, requestedDocumentList[], documentRequestNote,
  offerLetterUrl, joiningDate, joiningNote, finalStatusNote, cvUrl, supportingDocuments[], customFieldResponses{},
  interviewHistory|null, ...`) + `matchPercent`, `candidate` (own formatted candidate), `job` (raw job +
  `hospital` name, `hospitalLogoUrl`, `customApplicationFields`), `applicationDocuments[]`.
- Errors: 403 `Use admin API routes for application data.` (admin) · 500.

#### 18. `POST /api/applications` — B: `applicationRoutes.ts:503` · W: `lib/applications.ts:78`
- Auth: CANDIDATE. No limiter.
- Body, form/quick apply: `{ jobId, cvSource: "form", profile, customFieldResponses?, cvUrl?, cvCloudinaryId?, cvName?, cvMime?, supportingDocuments? }`.
- Body, CV upload: `{ jobId, cvSource: "upload", cvUrl, cvCloudinaryId, cvName, cvMime, uploadedCv: { contact: { name, email, phone } }, customFieldResponses? }`.
  Upload path updates the candidate's contact data from `contact` (side effects: see `docs/client/`, local only).
- 201: `formatApp`. Notifies hospital recruiters ("New Application").
- Errors: 400 `No candidate profile linked to your account` · 400 `jobId is required` · 404 `Job not found` ·
  403 `This position is no longer accepting applications.` · 400 `This job is no longer accepting applications` ·
  409 `You have already applied to this job` · custom fields: `"<label>" is required` / `"<label>" must be a number` /
  `"<label>": invalid option` / `"<label>" is too long` · `CV does not belong to your account.` / `Invalid CV URL.` ·
  `Profile is required for form applications` · `CV file is required for upload applications` ·
  `You must fill up the structured form once before you can apply to any job.` · other errors → 400 with the message (≤ 200 chars).

#### 19. `PATCH /api/applications/:id` — B: `applicationRoutes.ts:633` · W: `features/applications/CandidateActionCard.tsx:35`
- Auth: CANDIDATE (owner). No limiter.
- Body: `{ status, candidateResponseNote? }`. Candidate transitions (`applicationRoutes.ts:103`):
  `InterviewScheduled → InterviewAccepted | InterviewDeclined | RescheduleRequested` (needs `candidateResponseNote`),
  `DocumentsRequested | AdditionalDocumentsRequired → DocumentsUploaded`, `OfferSent → OfferAccepted | OfferRejected`.
- 200: `formatApp`. Recruiters are notified.
- Errors: 400 `status is required` · 404 `Application not found` · 403 `Forbidden` ·
  400 `Application status "<s>" is final and cannot be changed.` ·
  400 `Cannot move from "<a>" to "<b>" as CANDIDATE. Allowed: <list or none>.` ·
  400 `A reason is required to request a reschedule` · 500.
- Website ignores the body on error and always shows `Failed to update status`.

#### 20. `POST /api/applications/:id/documents` — B: `applicationRoutes.ts:898` · W: `CandidateActionCard.tsx:58`
- Auth: CANDIDATE (owner). No limiter. `multipart/form-data`, field **`documents`** (max 15 files), optional
  `names[]`/`name`. Allowed: **PDF, JPEG, PNG, WebP**, ≤ **10 MB** each, magic bytes checked.
- 201: `[ApplicationDocument { id, applicationId, name, url, cloudinaryId, mime, uploadedBy, uploadedAt }]`.
  Moves status to `DocumentsUploaded` if it was `DocumentsRequested`/`AdditionalDocumentsRequired`.
- Errors: 400 `No documents provided` · 400 `Invalid file type: <mime>. Only PDF, JPEG, PNG, and WebP are allowed.` ·
  400 `File too large` · 400 `Invalid file type.` · 404 · 403 `Forbidden` · 500 with message.

### Uploads (Cloudinary, all `uploadLimiter`, all CANDIDATE)

#### 21. `POST /api/upload/cv` — B: `routes/uploadRoutes.ts:35` · W: `lib/fileUpload.ts:73`
- Field **`cv`**, one file, ≤ **5 MB**. MIME: PDF, DOC, DOCX, JPEG, PNG, WebP (website only offers PDF/DOC/DOCX).
- 200: `{ url, publicId, name, mime }`. Also saves `cvUrl`, `cvCloudinaryId`, `uploadedCvName`, `uploadedCvMime` on the candidate.
- Errors: 400 `No CV file provided` · 400 `Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.` ·
  400 `Invalid file type.` · 400 `No candidate profile linked` · **file > 5 MB → 500 `Internal Server Error`**
  (multer not wrapped here).

#### 22. `POST /api/upload/documents` — B: `uploadRoutes.ts:237` · W: `lib/fileUpload.ts:99`
- Field **`documents`**, up to 10 files, ≤ 5 MB each, same MIME list as CV.
- 200: `[{ url, publicId, name, mime }]` (not saved to the candidate; the caller passes them as `supportingDocuments`).
- Errors: as CV (oversize → 500).

#### 23. `POST /api/upload/avatar` — B: `uploadRoutes.ts:121` · W: `lib/fileUpload.ts:135`
- Field **`avatar`**, ≤ 5 MB, JPEG/PNG/WebP. 200: `{ url, publicId }`; saves to candidate, deletes old avatar.
- Errors: 400 `No image file provided` · 400 `Profile picture must be less than 5MB.` · 400 `File too large` ·
  400 `Unsupported file format. Please upload a JPG, PNG, or WEBP image.` · 400 `Invalid image file.` · 500.

#### 24. `DELETE /api/upload/avatar` — B: `uploadRoutes.ts:194` · W: `lib/fileUpload.ts:151`
- 200: `{ success: true }`. Errors: 400 `No candidate profile linked` · 500 `Failed to remove profile picture`.

### Notifications (no limiter)

#### 25. `GET /api/notifications` — B: `routes/notificationRoutes.ts:43` · W: `components/common/NotificationsMenu.tsx:38`
- 200: `{ data: [{ id, title, message, read, unread, link|null, createdAt }], unreadCount }`, newest 50 only.
- `link` values seen: `/applications` for candidates (website paths, not app routes).

#### 26. `PATCH /api/notifications/:id/read` — B: `notificationRoutes.ts:61` · W: `NotificationsMenu.tsx:66`
- 200: the updated notification. Errors: 404 `Notification not found` · 500.

#### 27. `GET /api/notifications/stream` (SSE) — B: `notificationRoutes.ts:30`, `lib/sseManager.ts` · W: `hooks/useSSE.ts:16`
- Auth header required, so the website uses `@microsoft/fetch-event-source`. Events: `connected` on open,
  `notification` with `{ id?, title, message, ... }` when an `InAppNotification` row is created (Prisma
  extension, `lib/prisma.ts:13,31`), heartbeat every 30 s. In-memory, one server instance only.
- **App will not use this** (polling now, push in Phase 4).

### Other

#### 28. `GET /health` — B: `index.ts:161` · W: `routes/__root.tsx:96` (warm-up check)

---

## Exists in the backend but the website does not call it

| Endpoint | B: | Use for the app |
| --- | --- | --- |
| `GET /api/auth/me` | `authRoutes.ts:284` | Session check. Returns `{ user: { id, email, name, role, hospitalId, candidateId, ...recruiter plan fields, notifOnApply, notifWeekly, notifHighMatch } }`. Limiter: none. Cheaper than `/api/candidates/me`. |
| `PATCH /api/auth/me` | `authRoutes.ts:333` | Change name / notification prefs; returns a **new token**. |
| `POST /api/auth/resend-otp` | `authRoutes.ts:519` | Body `{ mobile, role }`. Only works for **existing** users (reset template); fake success otherwise. **Not usable for signup.** |
| `GET /api/applications/:id` | `applicationRoutes.ts:339` | Single application. |
| `GET /api/applications/:id/documents` | `applicationRoutes.ts:868` | Documents for one application. |
| `PATCH /api/notifications/read-all` | `notificationRoutes.ts:81` | `{ ok: true }`. |
| `DELETE /api/upload/cv/:publicId` | `uploadRoutes.ts:94` | Delete own old CV from Cloudinary. |

---

## Notes for the app

1. **Shared OTP limiter, per IP, 5 per 15 min.** Signup uses 2 calls (send + verify) and forgot-password
   uses 3. On mobile networks many users share one IP, so real users can hit it. The app must show the 429 message
   clearly. Phase 4 item 3 (per-user limits) is important.
2. **Login and register share `authLimiter`** (20 per IP per 15 min).
3. **No resend for signup OTP.** The website has no resend button; the user goes back and presses
   "Send OTP" again (another send-otp call). `resend-otp` only works for existing accounts.
4. **Mobile is not normalised.** Signup stores `mobile` exactly as typed (`+91 98765 43210`, `9876543210`, ...)
   and sends it raw to Fast2SMS. Forgot-password tries 6 variants. Some saves also touch the stored number (see `docs/client/`, local only).
5. **Session restore**: website uses `GET /api/candidates/me` (`searchLimiter`, heavy). The app plans
   `/api/auth/me`, which exists and works for candidates, but the website does not use it. See `DECISIONS.md`.
6. **Logout is client-only**: there is no server call (token lifetime: see `docs/client/`, local only).
7. **Role check**: login can only return CANDIDATE or RECRUITER. Admins use a different table and endpoint.
8. **Errors from Fast2SMS** are passed through raw on forgot-password verify; wording is not under our control.
9. **Oversized CV/document upload → 500**, not 400. The app must check size (≤ 5 MB) before uploading.
10. **Document request upload** allows PDF/JPEG/PNG/WebP only (10 MB). The website picker also offers DOC/DOCX,
    which the backend then rejects.
11. **`postedDays` is always 0** (set once at creation, never updated). The website therefore shows
    "Posted today" for every job and its "newest" sort does nothing. `postedOn` is the real date.
12. **`q` search is case-sensitive** on Postgres. The website avoids it by filtering on the device.
13. **Privacy and security notes for the backend are kept outside this public repository** (`docs/client/`, local only).
    Already fixed and live: saved-jobs no longer returns other candidates' applications (PR 1, `5b569f1`); the public job
    list no longer returns the recruiter's email (PR 1); profile save only accepts allow-listed fields (PR 2, `f185fe0`).
14. **No paging anywhere** except `?page=` on applications. Gov/intl jobs return all rows.
15. **Status labels** come from `candidates/src/lib/applicationStatus.ts` (26 statuses) — copy exactly. See SCREENS.md.
16. Response shapes include many extra fields. Our Zod schemas must use `.passthrough()` and only require what we use.
17. **Migrations lag `schema.prisma`** (found in Task 4, 2026-10-25). No migration creates `Hospital.logoUrl`,
    `Hospital.logoCloudinaryId`, `GovJob` or `InternationalJob`, yet the live site serves gov/intl jobs, so production was
    probably synced by hand (`prisma db push`): Render's start command is `npx tsx src/index.ts` (checked 2026-10-26), so no migration runs on deploy at all, `npm start` is not used. Our local backend
    runs `migrate deploy` then `db push`. Worth raising with the backend team before Phase 4.
