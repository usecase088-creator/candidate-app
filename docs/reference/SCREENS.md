# Screens reference (candidate website)

Source: `apronhanger/job` @ `conflict-resolution1` / `3fa6885`. Paths relative to `../job/candidates/src`.
Router: TanStack Router (file routes). Skipped: `messages.tsx` (coming soon), `impersonate.tsx` (admin only) — D12.

16 route files, 2 of them layouts → **14 screens**:

| # | Route | File | Sign-in | App phase |
| --- | --- | --- | --- | --- |
| – | root layout | `routes/__root.tsx` | – | 1 |
| 1 | `/auth` (sign in + sign up) | `routes/auth.tsx` | guests only | **1** |
| 2 | `/auth/forgot-password` | `routes/auth_.forgot-password.tsx` | no | **1** |
| 3 | `/` Opportunities (home) | `routes/index.tsx` | no (filters need sign-in) | 2 |
| 4 | `/jobs/$jobId` | `routes/jobs.$jobId.tsx` | no | 2 |
| 5 | `/saved-jobs` | `routes/saved-jobs.tsx` | yes | 2 |
| 6 | `/gov-jobs` | `routes/gov-jobs.tsx` | yes | 2 |
| 7 | `/foreign-jobs` | `routes/foreign-jobs.tsx` | yes | 2 |
| – | `/apply/$jobId` layout + loader | `routes/apply.$jobId.tsx` | yes | 3 |
| 8 | `/apply/$jobId/` chooser | `routes/apply.$jobId.index.tsx` | yes | 3 |
| 9 | `/apply/$jobId/form` | `routes/apply.$jobId.form.tsx` | yes | 3 |
| 10 | `/apply/$jobId/upload` | `routes/apply.$jobId.upload.tsx` | yes | 3 |
| 11 | `/applications` | `routes/applications.tsx` | yes | 3 |
| 12 | `/build-cv` | `routes/build-cv.tsx` | yes | 4 |
| 13 | `/cv-preview` | `routes/cv-preview.tsx` | yes | 4 |
| 14 | `/profile` | `routes/profile.tsx` | yes | 4 |

Sign-in guard: `requireCandidateAuth` (`lib/requireAuth.ts`) → `/auth?redirect=<path>&mode=signin`.
Guard only checks that a token exists in `localStorage`, not that it is valid.

---

## Root layout — `__root.tsx`

- Top nav (`components/layout/TopNav.tsx`). Signed out: Opportunities, Govt Jobs, International Jobs.
  Signed in: + Saved, Applications, Profile, notifications bell, user menu with **Sign out**.
- **Sign out** (`TopNav.tsx:51`): clear profile cache, saved-job ids, hydration guard, token + user; go to `/`.
  No backend call.
- On start, if a token exists: `hydrateProfileFromApi()` (`GET /api/candidates/me`) and saved-job ids (`GET /api/saved-jobs`).
- Warm-up: if `/health` takes > 2 s, toast **"Server is warming up..."** /
  "Please allow up to 30 seconds for the first request to complete." (30 s).
- Live notifications via SSE (`hooks/useSSE.ts`): toast with `title` / `message`.
- 401 on any non-`/auth` call while signed in → sign out and go to `/auth?redirect=<path>`.
- Not found: Lottie + link **"Go to opportunities"**. Error: **"Something went wrong"** + error message + **"Try Again"**.

---

## 1. Sign in / Create account — `auth.tsx`

One screen, two modes (`?mode=signin|signup`, default signin; `?redirect=` path). Signed-in users are sent to `/`.

**Mode tabs**: "Sign In" | "Create Account" (+ "New" badge). Switching resets step, OTP, errors.

**Headings**
- Sign in: **"Welcome back"**; sub: "Sign in to continue your application." (when `redirect` set) or
  "Sign in to access your saved jobs and applications."
- Sign up: **"Create your account"** + "Candidate" badge; sub: "Join 1.2L+ verified healthcare professionals across India."

### Sign in
| Field | Label | Placeholder | Type |
| --- | --- | --- | --- |
| email | `Email *` | `you@example.com` | email |
| password | `Password *` | `••••••••` | password, eye toggle |

- Link next to Password: **"Forgot password?"** → `/auth/forgot-password`.
- Validation (`lib/validations.ts:272`, shown under each field and in a red box at the top = first error):
  ```ts
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  ```
- Submit: **"Sign in"**; while busy **"Please wait…"** (button disabled).
- Flow: `POST /api/auth/login` → if `user.role` is RECRUITER show
  `rolePortalMismatchMessage` (below) and **do not save the token** → else clear old profile, save token + user,
  `GET /api/candidates/me`, toast **"Welcome back!"**, success Lottie, after **1.2 s** go to `redirect`
  (only if it starts with `/` and not `/auth`) or `/`.
- Errors (`lib/authMessages.ts:16`, shown in the red box **and** as a toast):
  | Status | Message |
  | --- | --- |
  | 401 | `Invalid email or password. Please try again.` |
  | 400 | server `error` or `Please check your email and password.` |
  | 409 | server `error` or `This email is already registered.` |
  | ≥ 500 | `Server error. Please try again in a moment.` |
  | other (403, 429) | server `error` or `Something went wrong. Please try again.` |
  | network | `Network error. Please check your connection and try again.` |
- Role message (`lib/authMessages.ts:4`), exact:
  `This email is registered as a recruiter account. Please sign in on the Recruiter Portal instead.`
- Below form: card **"New to ApronHanger?"** / "Build your verified candidate profile and unlock one-click
  applications to top hospitals." / button **"Create an account"** / "100% Free • Verified Hospitals • Fast Response".
- Footer: "Verified credentials". (Google/LinkedIn buttons exist in code but are not rendered.)

### Sign up — step "details" (one form)
| Field | Label | Placeholder |
| --- | --- | --- |
| name | `Full name *` | `Dr. Aarav Mehta` |
| mobile | `Mobile Number *` | `+91 9876543210` |
| email | `Email *` | `you@example.com` |
| password | `Password *` | `Min. 8 chars, 1 upper, 1 lower, 1 special` |

Under password, box **"Password Requirements:"**: "At least 8 characters long", "At least one uppercase letter (A-Z)",
"At least one lowercase letter (a-z)", "At least one special character (e.g. @, #, $, etc.)".

Validation (`lib/validations.ts:86-91, 277-285`), exact:
```ts
const phoneSchema = z.string()
  .min(10, "Enter a valid 10-digit phone number")
  .max(15, "Phone number is too long")
  .regex(/^[\d\s+\-()]+$/, "Phone number can only contain digits and + - ( )");

authSignUpSchema = {
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  mobile: phoneSchema,
}
```
No `+91` handling: the mobile is sent **exactly as typed**, no trim, no prefix added or removed.

Checkboxes (below the button):
1. Required: "I have read and agree to the **Terms & Conditions**." → `/APRONHANGER_Work_Terms_and_Conditions.pdf`
2. Required: "I consent to the collection, processing, storage and sharing of my personal and professional
   information for recruitment purposes as described in the **Privacy Policy**." → `/privacy-policy.html`
3. Optional: "I would like to receive relevant job alerts, career opportunities and updates from APRONHANGER. (Optional)"
   — **never sent to the backend**.

If 1 or 2 is unchecked: `Please accept the Terms & Conditions and Privacy Consent to continue.`

Submit **"Send OTP"** → `POST /api/auth/signup/send-otp { mobile, role: "CANDIDATE" }` → toast
**"OTP sent to your mobile number."** → step "otp". Errors via `loginErrorMessage`.

### Sign up — step "otp"
- Field `Mobile OTP *`, placeholder `123456`, digits only, max 6 (non-digits stripped as you type).
- Text: "Enter the OTP sent to {mobile}." Link **"Edit signup details"** goes back to the details step.
  The fields come back **empty** (uncontrolled inputs remount without values; checkboxes keep their state).
- Submit **"Verify & create account"**. If fewer than 6 digits: `Please enter a valid 6-digit OTP.`
- Flow: `POST /signup/verify-otp` (error: server `error` or `Invalid OTP.`) → `POST /register` with the draft +
  `signup_token` (errors via `loginErrorMessage`) → save token → `GET /api/candidates/me` → toast
  **"Account created!"** → after 1.2 s go to `/` (ignores `redirect`).
- **No resend button, no countdown.** To get a new OTP, "Edit signup details" → "Send OTP" again.

---

## 2. Forgot password — `auth_.forgot-password.tsx`

Steps: `phone → otp → reset → success`. Errors and successes are **toasts only** (no inline errors).

| Step | Title | Subtitle | Field | Button |
| --- | --- | --- | --- | --- |
| phone | **Reset Password** | Enter your registered mobile number to receive an OTP. | `Mobile Number`, tel, placeholder `Enter 10-digit number` | Send OTP |
| otp | **Verify & Reset** | Enter the OTP sent to {phone}. | `OTP`, placeholder `123456`, digits only, max 6 | Verify OTP |
| reset | **Verify & Reset** | Set a new password for {maskedEmail} | `New Password`, placeholder `Min. 8 chars, 1 upper, 1 lower, 1 special`, eye toggle | Reset Password |
| success | **Success!** | Your password has been reset successfully. | – | – |

- Back link to `/auth` on every step. Loading: spinner in the button.
- phone: empty → `Please enter your registered mobile number.` (no other check). `POST /forgot-password` →
  `OTP sent to your mobile number.`; error → server `error` or `Failed to send OTP. Please check your number.`
- otp: `< 6` → `Please enter a valid 6-digit OTP.`; `POST /verify-otp` → error: server `error` or `Invalid OTP.`
- reset, checked in order: `Password is required.` · `Password must be at least 8 characters.` ·
  `Password must contain at least one uppercase letter.` · `... lowercase letter.` · `... special character.`
  (same regexes as signup, but **with a full stop**). `POST /reset-password` → toast
  **"Password reset successfully! Please sign in with your new password."** → success step → after 2.5 s full reload to `/auth`.
- Any network error: `Network error. Please try again.`
- No resend button.

---

## 3. Opportunities (home) — `index.tsx`

- `GET /api/jobs` (with token if signed in → `matchPercent`). Loading: full-page loader.
- **Error**: there is none. A failed fetch shows the empty state.
- Banner (if no profile, dismissible): guest → "Join 1.2L+ healthcare professionals on ApronHanger" /
  "Create your candidate profile to get verified, unlock one-click applications, and get discovered by top hospitals."
  + "Create Account", "Build CV". Signed in → "Build your ApronHanger CV in one go" / "Fill the detailed form once —
  we'll generate your CV and unlock Quick Apply on every job." + "Fill the form".
- Hero: search text + city (`?q=&city=`), category and specialty rails, recommended rail (`RecommendedRail`, signed-in, profile ≥ 20%).
- Filter sidebar: cities, min experience, min salary, job types, sort (`salary` | `relevance` | newest by `postedDays`).
  **Changing filters, category or specialty requires sign-in** (guests are sent to `/auth`).
- Search is client-side (`lib/jobSearch.ts`): lower-case `includes` over role, specialty, hospital, location, city,
  category, type, tags, description (HTML stripped); city matches `city + location`.
- List header "All Opportunities" / "Showing {n} of {total} verified roles".
- Empty: "No open positions yet" / "Hospitals post roles from the recruiter portal. Check back soon or widen your
  search." (no jobs) or "No matches" / "Try clearing filters or searching for a different role."
- Also on home: government jobs reel (`components/home/GovJobsFilmReel.tsx`, `GET /api/gov-jobs`).

## 4. Job details — `jobs.$jobId.tsx`

- Loader: `GET /api/jobs/:id` (**no token**, so no match score here), then similar jobs
  `GET /api/jobs?category=&excludeId=&limit=4` if the job has a category.
- Not found: **"Job not found"** + "Browse opportunities".
- Content: logo, role, "Verified Hospital" badge, hospital · specialty, location, type, "Posted today" / "Posted {n}d ago",
  tags, "About the role" (HTML sanitised with DOMPurify), "Responsibilities", "Requirements", "Perks & benefits",
  "About {hospital}".
- Side card: "Compensation" ₹{salaryMin}–{salaryMax} LPA; Experience (`formatExp` or `experience` or "—"), Job type,
  Location (city), Posted. Button **"Apply Now"** → `/apply/:id`, or disabled **"Position closed"** when
  `status === "Closed"`. Save button. "Salary disclosed by hospital · Verified". "🧑‍⚕️ {n} people have already applied".
- "Match insights": "Your profile matches {n}% of this role's criteria." or "Complete your profile for a personalized match."
- "Similar opportunities" (up to 4 job cards).

## 5. Saved jobs — `saved-jobs.tsx`

- `GET /api/saved-jobs`. Title "Saved jobs", "{n} role(s) bookmarked for later", link "Browse opportunities →".
- Empty: "No saved jobs yet" / "Tap the bookmark icon on any job to save it here." / "Find opportunities".
- Error: falls through to the empty state (no error message).
- Save/unsave (`store/savedJobsStore.ts`): **not optimistic** — waits for the API, then updates the icon.
  Errors `Failed to save job` / `Failed to remove saved job` (or server message).

## 6. Government jobs — `gov-jobs.tsx`

- Sign-in required. `GET /api/gov-jobs`. Search "Search by authority or exam name…" (authority or name, lower-case).
- Stats: total, "With Deadline", "Open-ended". Row: authority, name, last date (`Expired · {date}` in red; ≤ 7 days left
  in amber), button **"View / Apply"** → external `link` (disabled when expired).
- Error → empty list.

## 7. International jobs — `foreign-jobs.tsx`

- Sign-in required. `GET /api/intl-jobs`. Country chips ("All" + sorted countries), search
  "Search by role, specialty, city…" (position, specialty, city, country, qualification, license).
- Visa badge colours: Sponsorship, Employer, Depends, Self, Not Required, TBD. Button **"Apply"** → external `applyLink`
  (disabled when expired). Same deadline styling as gov jobs.

## 8. Apply chooser — `apply.$jobId.index.tsx` (loader in `apply.$jobId.tsx`)

- Loader: `GET /api/jobs/:id` + `GET /api/applications` → `alreadyApplied` if any application has this `jobId`.
  Job missing → not found.
- Already applied: **"Already applied"** / "You have already submitted an application for {role} at {hospital}." /
  "View my applications".
- "Applying for" {role} {hospital · location}. **"Choose one way to apply"** / "Use the structured form **or** upload a CV
  file — not both for the same application."
- Card "Structured form" / "15-step form that builds your professional CV and syncs to recruiters." / "Start form"
  (or "Edit & apply"); "Recommended" when no form CV.
- Card "Upload CV" / "Submit a PDF or DOCX only. Your portal form CV won't be used for this application." /
  "Upload & apply"; disabled with "You must complete the structured form once before you can use CV upload."
- Rule: **form CV exists = profile and `completeness >= 30`** (completeness is computed on the device, `data/profile.ts:324`, 17 checks).
- Job questions (`customApplicationFields`, types text/textarea/number/select/checkbox): "Answer these job-specific
  questions" / "Required for all application methods (form, upload, or quick apply)." Validation
  (`lib/jobCustomFields.ts`): `"{label}" is required` · `"{label}" must be a number` · `"{label}": choose a valid option`.
- **Quick Apply** card ("One tap with your saved form CV") → `POST /api/applications` (form, profile) →
  toast "Application submitted!" → `/applications`; button "Submitting…" while busy. Without a form CV:
  "Quick Apply unlocks after you complete the structured form once."

## 9. Apply with form — `apply.$jobId.form.tsx`

- Already applied screen (as above, shorter text) or `ProfileFormWizard` in apply mode → after submit `/applications`.

## 10. Apply with CV upload — `apply.$jobId.upload.tsx`

- Without form CV: **"Structured Form Required"** / "To maintain quality profiles for recruiters, candidates are not
  allowed to apply by CV upload without first completing the structured form." / "Back", "Start structured form".
- Fields: "Full name" (from user), "Email" (from user), "Phone" (from profile). Schema `uploadApplySchema`:
  ```ts
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: phoneSchema,
  ```
- File: "Click to upload your CV" / "PDF or Word (.pdf, .doc, .docx), up to 5MB". Client errors:
  `Please upload a PDF or Word document (.pdf, .doc, .docx)` · `File must be under 5MB` ·
  `Please upload your CV (PDF or Word document)` (none chosen).
- Submit "Submit application" ("Submitting…") → `POST /api/upload/cv` → `POST /api/applications` (upload) → toast
  "Application submitted with your CV!" → `/applications`. 409 → server message.

## 11. My Applications — `applications.tsx`

- `GET /api/applications`, sorted by `appliedOn` desc. Error: red message + **"Try again"** (only screen with an error state).
- Title "My Applications", "{n} application(s) · fetched at {HH:MM}".
- Tabs (match on **display label**): All, Applied, Reviewed, Interview Scheduled, Shortlisted, Documents Requested,
  Offer Sent, Rejected, Joined — each with a count.
- Empty: "No applications yet" / "Start applying to opportunities and track your progress here." / "Browse opportunities".
- Row: logo, role (link to job), hospital · city, "Applied {d MMM yyyy}" (en-IN), status pill, timeline, last update:
  `JobClosed` → "This job posting has been closed by the recruiter"; `Applied` → "Application received by hospital";
  else "Status updated to {label}".
- Timeline steps: Applied → Reviewed → Interview → Documents → Offer & Joining (`lib/applicationStatus.ts`).
  Rejected: "Application closed by recruiter". (A "Job closed" message exists but never shows: the label is "Job Closed".)
- Status labels (`lib/applicationStatus.ts`), exact:
  Applied · Reviewed · Interview Scheduled · Interview Accepted · Interview Declined · Reschedule Requested ·
  Interview Completed · No Show · Interview Rescheduled · Shortlisted · On Hold · Next Round · Rejected ·
  Documents Requested · Documents Uploaded · Documents Approved · **Additional Docs Required** · Documents Rejected ·
  Offer Sent · Offer Accepted · Offer Rejected · Joining Confirmed · Joined · Onboarded · Dropped · Job Closed.
  Legacy: `New` → Applied, `Contacted` → Offer Sent.
- Pill colours: terminal (except Onboarded) = destructive; interview/reschedule = indigo; document = amber;
  offer/join/shortlisted/onboarded = emerald; reviewed = sky; applied = muted.

**Action card** (`features/applications/CandidateActionCard.tsx`), by status:
- `InterviewScheduled`: "Interview Scheduled", Date (Asia/Kolkata, medium date + short time), Type, "Link: Join Meeting"
  (Virtual) or "Venue: {venue|TBA}", Interviewer. Buttons **Accept**, **Request Reschedule**, **Decline**.
  Reschedule: textarea "Please provide your availability for rescheduling..." + "Submit Request" (disabled when empty) + "Cancel".
- `DocumentsRequested` / `AdditionalDocumentsRequired`: "Document Request" / "The hospital has requested the following
  documents to proceed with your application:" + list + "Note: {note}". "Choose Files" (multi), "{n} file(s) selected" /
  "No files selected", "Upload Documents". Client: each ≤ 5 MB → `"{name}" exceeds 5MB. Please use a smaller file.`
- `DocumentsUploaded`: "Documents Submitted" / "Your documents have been submitted and are under review by the hospital.
  You'll be notified once they are approved or if additional documents are required."
- `OfferSent`: "Offer Letter Received" / "Congratulations! The hospital has sent you an offer letter." /
  "View Offer Letter" / **Accept Offer**, **Reject Offer**.
- `JoiningConfirmed` / `Joined` / `Onboarded` with a date: "Joining Date" / "Your joining date is **{d MMM yyyy}**."
- Success toast "Response recorded successfully!" / "Documents uploaded successfully!". Errors always
  "Failed to update status" / "Failed to upload documents" (server message ignored). No confirm dialogs.

## 12. Build CV — `build-cv.tsx`

`ProfileFormWizard` (`components/profile/ProfileFormWizard.tsx`, 2,071 lines) → after save `/cv-preview`.
16 steps (the site calls it "15-step"): Basic Details · Medical Work Profile · Registration & Compliance ·
Qualifications & Training · Clinical Experience · Clinical Skills · Procedures · Research & Citations ·
Audit, Teaching & Leadership · Certifications · Availability & Preferences · Salary Expectations · Languages ·
Professional Summary · Document Vault · Review & Submit.
Per-step checks: `validateWizardStep` (`lib/validations.ts:114`), exact messages there (e.g. step 0: `Full name is required`,
`Please select your state`, `Enter a valid public profile URL`; step 13: `Professional summary should be at least 40 characters`).
Save: `PUT /api/candidates/me` (+ `POST /api/upload/documents` for the vault) → "Profile saved". Fields and steps are
**to be detailed at the start of Phase 4**.

## 13. CV preview — `cv-preview.tsx`

- No profile: "No CV yet" / "Your ApronHanger CV is generated from the form. Fill it once and it'll be ready for every
  Quick Apply." / "Build my CV".
- Upload-only: "You've uploaded a CV" / "Your CV document **{name}** has been uploaded and will be sent with your
  applications." / "Download Document", "Switch to Form CV".
- Else "Generated CV" / "Your professional profile", "Attached Document", "Edit CV", "Download PDF"
  (`lib/cvPdf.ts`, HTML → PDF in the browser; app will use expo-print).

## 14. Profile — `profile.tsx` (1,539 lines)

- Empty: "Your CV hasn't been built yet". Header with avatar (upload/remove: `POST/DELETE /api/upload/avatar`;
  client errors `Profile picture must be less than 5MB.`, `Unsupported file format.`), name.
- Cards: About, Experience, Education, Procedures & volume, Licenses & certifications, Publications & research,
  Attached CV, Supporting Documents, Professional registration, Availability, Availability Status, Preferred Locations,
  Clinical skills, Technical skills, Languages; "Profile strength" ring + checklist.
- **To be detailed at the start of Phase 4.**

---

## Notes for the app

1. **Signup is 2 steps, not 3.** Name, mobile, email, password and both consents come first, then OTP. Register
   happens right after a correct OTP. PHASE-1 Task 8 must follow this.
2. **No resend / no cooldown** on either OTP screen. If we add "Resend", it calls send-otp again and burns the
   shared 5-per-15-min OTP limit (API.md note 1). Needs a decision before Task 8.
3. **Mobile is sent as typed** (no +91 handling). For parity we do the same; a phone that formats differently may fail
   at Fast2SMS. Needs a decision.
4. **Marketing consent is collected but never saved.** Show it for parity; it goes nowhere.
5. **Website bug: "View Offer Letter" opens `https://apronhanger.work`** (hard-coded), not `offerLetterUrl`
   (`CandidateActionCard.tsx`, OfferSent block). The app should open `offerLetterUrl` — needs a DECISIONS entry.
6. **Only RECRUITER is rejected at login**; ADMIN cannot reach this login at all.
7. **Weak error states**: home, saved jobs, gov/intl jobs show "empty" on network failure. The app must show a real
   error + retry (CLAUDE.md definition of done) — this is a deliberate improvement, keep the website wording for empty.
8. **"Posted today" everywhere** (`postedDays` is always 0). Showing the real date from `postedOn` needs a decision.
9. Forgot-password password messages end with "." and signup ones don't — copy each as is.
10. Interview time shown in **Asia/Kolkata**; dates use `en-IN` (`d MMM yyyy`). Use the same in the app.
11. Applications list tabs filter by display label; "Interview Accepted", "Offer Accepted" etc. appear only under "All".
12. Guest restrictions on home (filters need sign-in) are odd on mobile; keep for parity unless Raj says otherwise.
13. Save/unsave is not optimistic on the website; PLAN.md asks for optimistic + rollback in the app (improvement, fine).
14. Notification `link` values are website paths (`/applications`); the Phase 4 deep-link router must map them.
