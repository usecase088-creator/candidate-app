# Phase 3 — Apply and applications (week 3) → Part 1 delivery

Status: **approved by Raj 2026-10-27, Task 0 in progress.** Raj's answers are in "Decisions" at the end.

Goal: a signed-in candidate can apply to a job (quick apply, apply with job questions, apply with their own CV), see all their
applications with the website's statuses, and answer what the hospital asks: accept / decline / reschedule an interview, upload
requested documents, accept / reject an offer and open the offer letter. Android phone against the local backend; iPhone
simulator at the end. Ends with the first test builds (Part 1 delivery).

Scope is exactly `docs/PLAN.md` "Phase 3". Anything else goes to `docs/CHANGE-REQUESTS.md` (Task 12).
Non-goals: the 15-step profile builder and CV PDF (Phase 4), notifications and push (Phase 4), backend changes, store builds, paging.

Source of truth: the website (`../job/candidates/src`: `lib/applications.ts`, `lib/applicationStatus.ts`, `lib/jobCustomFields.ts`,
`lib/fileUpload.ts`, `routes/apply.$jobId.*.tsx`, `routes/applications.tsx`, `features/applications/CandidateActionCard.tsx`),
`docs/reference/API.md` §17–22, `docs/reference/SCREENS.md` §8–11. Where the website and the docs differ, the code wins.

## Findings from reading the website (2026-10-27)

1. **A candidate who has never filled the website's form cannot apply at all.** Quick apply and "Upload CV" both need a form CV
   (`profile.completeness >= 30`), and the form is the 15-step wizard, which is Phase 4. So in Phase 3 the apply flows work for
   candidates whose profile already exists (built on the website, or seeded for tests). A brand-new app-only signup sees the
   website's wording ("You must complete the structured form once before you can use CV upload.", "Quick Apply unlocks after you
   complete the structured form once.") and the "Start form" card says the form arrives in the next update. **Raj decision needed
   (question 1 below)**: this affects what "Part 1 installed on the client's phone" can demonstrate.
2. **Quick apply sends the whole profile object from the device** (`POST /api/applications`, `cvSource: "form"`, `profile`), and the
   server uses it to refresh the candidate's record. The app must send back exactly what `GET /api/candidates/me` returned in
   `profile` (plus `cvUrl`, `avatarUrl`, ...), untouched. The completeness number is stored inside the profile; the app does not
   compute it in Phase 3 (the 17-check computation arrives with the wizard in Phase 4).
3. **Upload-CV apply sends name, email and phone** from the three fields on that screen and the server stores them
   (API.md §18; side effects in local `docs/client/`). The app copies the website (fields pre-filled from the account).
4. **Size limits differ by endpoint.** CV and supporting-document uploads: ≤ 5 MB, and a bigger file makes the server answer 500
   instead of 400, so the app checks size before sending. Requested-document upload (`/api/applications/:id/documents`): backend
   allows 10 MB and PDF/JPEG/PNG/WebP only, the website checks 5 MB. App: 5 MB (website), and only the four types the server
   accepts (the website also offers DOC/DOCX there, which the server then rejects).
5. **Website error handling is crude** ("Failed to update status", "Failed to upload documents" whatever the server said). The
   app shows the website's text as the headline and the server's message below it when there is one, as in Phase 1 and 2.
6. **Action card has no confirm dialogs** (accept offer, reject offer, decline interview are one tap). Same in the app; a wrong tap
   on "Reject Offer" cannot be undone because the status is final. Raj decision (question 3): add a confirm step for Decline
   and Reject Offer (small, deviates from the website, recorded as D26) or copy the website exactly.
7. **Date and time are shown in Asia/Kolkata** on the interview card, whatever the phone's time zone.
8. **The "applications" tab labels match the display label, not the stored status** ("Interview Scheduled" tab also shows
   `InterviewScheduled` only; `Interview Accepted` is its own label and is not under any tab except All). Copied as is.
9. **Applied job ids come from `GET /api/applications`** (no separate endpoint); the apply chooser uses it for "Already applied".
   Phase 2 shows "Apply Now" as a placeholder; this phase wires it.

## Task 0 — Before building

- [x] Reference sync check (`../job` = live = `f185fe0`, nothing to fast-forward): `../job` vs the live commit (read-only Render API). Only a `git fetch` + fast-forward with Raj's OK (D6).
- [x] Install Expo SDK packages (permissions checked on the merged manifest and plist: D26) with `npx expo install`: `expo-document-picker`, `expo-image-picker`, `expo-file-system`,
      `expo-sharing`. All are Expo SDK (allowed by CLAUDE.md) but **native**: the debug APK on the phone must be rebuilt
      (`prebuild` + Gradle, free, about 10 min) and an iOS simulator build is needed for the iPhone check (EAS free build,
      or the workflow's latest build is too old). Permissions text for camera and gallery goes in `app.config.ts`
      (store review needs a clear reason string).
- [x] Local backend seed (done: second demo account `applicant@apronhanger.test`, 8 closed jobs, one application per state, job questions on Radiology Technician; the Phase 2 candidate stays without a profile) (`scripts/backend-local`): the test candidate gets a form profile with completeness ≥ 30, one job with
      job questions (text, number, select, checkbox), a candidate for "no form CV" (cannot apply), and applications in these states:
      `Applied`, `InterviewScheduled` (virtual and in-person), `DocumentsRequested` (with a note and a list), `DocumentsUploaded`,
      `OfferSent` (with an offer letter link), `JoiningConfirmed` (with a joining date), `Rejected`. The seed also resets them,
      like the saved jobs reset in Phase 2.

## Task 1 — Schemas and endpoints (TDD)

- [ ] `src/api/schemas/applications.ts` (loose objects, defaults for lists): `Application` (status, appliedOn, interview fields,
      document request list and note, offer letter URL, joining date, `candidateResponseNote`, `customFieldResponses`,
      `applicationDocuments[]`, `job` with `hospital`, `hospitalLogoUrl`, `customApplicationFields`), `ApplicationDocument`,
      upload responses (`{ url, publicId, name, mime }`, list form), `CustomApplicationField` (text / textarea / number / select /
      checkbox). Fixtures recorded from the local backend. A missing required field throws a typed `ApiError`.
- [ ] `src/features/applications/applicationsApi.ts`: `list`, `quickApply`, `applyWithCv`, `respond(id, status, note?)`,
      `uploadDocuments(id, files)`, `uploadCv(file)`. MSW tests for URL, body, headers and parsing.
- [ ] Candidate profile for apply: `GET /api/candidates/me` parsed with the full profile kept as received (`unknown` inside, not
      `any`), `cvSource`, `completeness`, `cvUrl`.
- [ ] Contract tests (local backend, serial like Phase 2): list applications, quick apply, duplicate (409), job closed, custom field
      errors, accept interview, reschedule without a note (400), upload documents, accept offer, and the wrong-transition 400.

## Task 2 — Pure logic (TDD, `src/features/applications/logic/`)

- [ ] `status.ts`: the 26 labels, legacy `New` → Applied and `Contacted` → Offer Sent, pill colour group, timeline step, last-update
      text (`JobClosed`, `Applied`, other), tab membership and counts. Exact website wording (SCREENS.md §11).
- [ ] `customFields.ts`: `validateCustomResponses` with the website's three messages; `"{label}" is too long` from the server.
- [ ] `files.ts`: type and size rules per endpoint (CV: PDF/DOC/DOCX ≤ 5 MB; supporting docs ≤ 5 MB; requested documents: PDF,
      JPEG, PNG, WebP ≤ 5 MB) with the website's messages; file name cleanup; at most 15 files.
- [ ] `interview.ts`: IST date and time, type, link or venue; `canRespond(status)` from the candidate transitions in API.md §19.
- [ ] `apply.ts`: `hasFormCv(profile)`, `alreadyApplied(applications, jobId)`.

## Task 3 — Files: pickers and upload (TDD, `src/features/uploads/`)

- [ ] `pickFile` (documents via expo-document-picker) and `pickImage` (gallery) and `takePhoto` (camera) wrappers with the checks of
      Task 2 before anything is sent. Permission denied and cancel are normal outcomes (no error toast on cancel); a denied camera
      permission shows a plain message with a link to the system settings.
- [ ] Upload with **progress, cancel and retry**. Multipart needs progress events, which `fetch` does not give. Decision proposal
      (D26): the upload function lives in `src/api/createApiClient.ts` next to `fetch`, using `XMLHttpRequest` with the same
      token, base URL, timeout and error mapping, so "no network calls outside the client" still holds. Unit tests with MSW for
      success, server 400/401/500, network error, cancel, retry; the 500-for-oversize case never happens because of the size check.
- [ ] A reusable `FilePickerField` (shows name, size, progress bar, Remove, Retry) with testIDs and accessibility labels.

## Task 4 — Data hooks (TDD)

- [ ] `useApplications` (TanStack Query, key shared with the apply chooser), `useQuickApply`, `useApplyWithCv`, `useRespondToApplication`,
      `useUploadRequestedDocuments`. After a successful action the applications list is refetched (server is the truth: no
      optimistic update for status changes, unlike saving a job). `409 You have already applied` refreshes the list and shows the
      "Already applied" state. Double taps are ignored while a request runs.
- [ ] Sign-out clears the applications cache (as the filter store in Phase 2).

## Task 5 — Apply chooser and quick apply (TDD)

- [ ] Route `apply/[jobId]` (behind `RequireSession`): "Applying for", "Choose one way to apply", Structured form card, Upload CV card,
      Quick Apply card, "Already applied" state, job questions block (all five field types), website texts exact. "Start form /
      Edit & apply" shows the Phase 4 note (finding 1). States: loading (skeleton), job not found, error + "Try Again", offline.
- [ ] "Apply Now" on job details (Phase 2 placeholder) opens this route; disabled when the job is closed, as before.
- [ ] Quick apply: validation of job questions, "Submitting…", toast "Application submitted!", then My Applications.

## Task 6 — Apply with CV upload (TDD)

- [ ] Route `apply/[jobId]/upload`: "Structured Form Required" screen when there is no form CV; otherwise Full name, Email, Phone
      (website schema and messages), file field "Click to upload your CV" with "PDF or Word (.pdf, .doc, .docx), up to 5MB" (tap
      wording adapted: "Choose your CV"), the three client errors, Submit → `uploadCv` → `applyWithCv`, toast "Application
      submitted with your CV!". Email is sent exactly as typed (no lowercasing).

## Task 7 — My Applications (TDD)

- [ ] Tab `Applications` (replaces the Phase 1 placeholder): title, count and "fetched at" time, tabs with counts, FlashList of rows
      (logo, role, hospital · city, applied date en-IN, status pill, timeline, last update), pull to refresh, empty state with
      "Browse opportunities", error with "Try Again", offline banner, skeletons.
- [ ] Application details route `application/[id]`: the row plus the action card for the current status (Task 8) and the documents
      the candidate already uploaded. Tapping the role opens the job.

## Task 8 — Action cards (TDD)

- [ ] `InterviewScheduled`: date and time (IST), type, "Join Meeting" link (opened in expo-web-browser, http(s) only) or venue,
      interviewer; Accept, Request Reschedule (note required, "Submit Request" disabled when empty), Decline.
- [ ] `DocumentsRequested` / `AdditionalDocumentsRequired`: request text, list, note; choose files (documents, gallery, camera), per file
      checks, progress, "Upload Documents"; then the "Documents Submitted" state.
- [ ] `OfferSent`: "Offer Letter Received", "View Offer Letter" (in-app browser), **download/share** (expo-file-system download to the
      cache, then expo-sharing; fallback to opening the link), Accept Offer, Reject Offer.
- [ ] `JoiningConfirmed` / `Joined` / `Onboarded` with a date: "Your joining date is {d MMM yyyy}."
- [ ] Every action: success toast with the website's text, failure shows "Failed to update status" / "Failed to upload documents" plus
      the server message, status refreshed after success, buttons disabled while busy.

## Task 9 — End-to-end

- [ ] Maestro on the real phone (local backend, seeded states): `apply-quick.yaml` (chooser → job question → quick apply → appears in
      My Applications), `apply-cv.yaml` (pick a file pushed to the phone with `adb`, submit), `application-interview.yaml` (accept,
      then reschedule with a note), `application-offer.yaml` (view letter opens the browser, accept), `application-documents.yaml`
      (upload requested documents). If the system file picker cannot be driven reliably, the picking step is the only manual one
      and is recorded on video; everything around it stays automated.
- [ ] Playwright (Chromium, API mocked): My Applications tabs and counts, apply chooser states, action card transitions.
- [ ] Whole existing Maestro suite (9 flows) still passes on Android.
- [ ] iPhone simulator workflow: the new flows that do not need a picker, plus the 9 existing flows (one clean app per flow, as now).

## Task 10 — Part 1 builds (these cost build minutes: asked at that point, not before)

- [ ] Android: EAS `preview` APK (internal distribution), installed on Raj's phone and the client's phone (link / QR).
- [ ] iPhone: TestFlight if the client's Apple account is active; otherwise the iOS simulator build on EAS and a screen recording (D4/D20).
- [ ] Sentry: the preview build sends one real test event; checked for personal data (HANDOFF item 3).
- [ ] Part 1 checklist against the SOW (Raj to give me the SOW checklist or confirm PLAN.md's Part 1 list is the list).

## Task 11 — Close the phase

- [ ] Parity checklist with the website apply and applications screens, `npm run check` green, coverage gates met,
      `docs/PHASE-3-SUMMARY.md` (plain language + technical appendix + client screen recording plan), `HANDOFF.md`, `CLAUDE.md`
      "Current phase", `DECISIONS.md` (D26+), `CHANGE-REQUESTS.md`.

## Rules for every task

- TDD, `npm run check` before each commit, conventional commits, no `any`, no `fetch` outside the API client (uploads: Task 3).
- Email sent exactly as typed. Tokens only in SecureStore. No personal data (names, files, CV text, offer links) in logs or Sentry:
  file names and URLs of candidate documents are scrubbed like other personal data.
- `PUT /api/candidates/me` is never called from the app in this phase.
- 8 GB laptop: never run the emulator, Expo web, Playwright and the backend all at once. Stop what was started.
- The repo is public: no secrets, no real candidate data, test files in `e2e/` are generated or tiny and made up.
- The staging server shares the dev database: reseed before every iPhone run.

## Decisions (Raj, 2026-10-27)

1. **(a)** Keep the PLAN.md order. The Part 1 demo uses a **demo account with a filled profile**, seeded on the local backend and on staging. No "complete my profile" screen (not built; (c) is rejected).
2. The 4 Expo packages are installed. After prebuild the merged Android manifest and the iOS Info.plist are checked: only camera and photo access with clear reason texts; no microphone, no broad media or storage permission. The final list is in DECISIONS.md (D26).
3. **Confirm step** before Decline interview and Reject offer (D26).
4. **XHR uploads inside `createApiClient.ts`.** First step of Task 3: check that MSW intercepts React Native's XHR under jest-expo. If it does not, the transport goes behind a small interface and is faked in tests.
5. **PLAN.md's Part 1 list is the list** (same as the SOW). The structured-form "review profile" step arrives with the Phase 4 profile builder.
6. **Assume the client's Apple account is NOT active:** iPhone = simulator build plus a screen recording. Raj will say if that changes.
7. Camera and gallery photos use the picker's quality setting (about 0.7) before the 5 MB check, so normal phone photos are not rejected.
8. Ask Raj before each EAS build.

## Extra checks Raj asked for in Task 0

- [x] Public docs scanned for notes about open weaknesses of the live backend: moved to local `docs/client/OPEN-WEAKNESSES.md`, public docs now only name the item ids (reported to Raj; git history still holds the old text).
- [x] Probe done on the local backend copy (quick apply with extra keys in `profile`): observed and reported only, nothing fixed; the result is in local `docs/client/PROBE-quick-apply-extra-keys.md`.
