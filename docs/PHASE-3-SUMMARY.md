# ApronHanger candidate app: Phase 3 summary

**Phase:** 3 of 5, "Apply and applications" · **Dates:** 27 October 2026 · **Status:** built; tested by computer (code, server and web checks) **and on the real Android phone (all 13 flows pass)**;
**iPhone: the app starts on the simulator (`smoke` passed) but the longer iPhone flows could not run (no macOS runner from GitHub); the Part 1 builds are not made yet** (section 6) · **Prepared for:** Raj and the ApronHanger client

---

## 1. In one minute

Phase 3 lets a signed-in candidate **apply for a job and follow what happens next**. They can apply in one tap with the profile saved on the website
(Quick Apply), apply with their own CV file, answer the job's own questions, see every application with its status, and respond when a hospital asks
something: accept, decline or ask to move an interview, upload requested documents, open and accept or reject an offer. It uses the same backend and the
same wording as the website. The backend was not changed.

What is verified: all automated checks pass (code, server, web at the smallest phone width), and **all 13 phone flows pass on the real Android phone**
(the 4 new ones and the 9 from Phases 1 and 2). The phone found one real bug that no automated check had caught: after Quick Apply, the new application was
hidden above the visible part of My Applications. It is fixed.
What is still open: the iPhone simulator (the app starts and signs in screen shows; the longer flows are waiting for GitHub to provide a Mac) and the first
test builds for the client, which wait for Raj's go-ahead (they use build minutes).

| | |
| --- | --- |
| Screens built | Apply chooser · Quick Apply · Apply with your CV · My Applications (list with tabs) · One application with its answer card |
| Answer cards | Interview · Document request · Documents submitted · Offer letter · Joining date |
| Automated checks | **1,171** code checks · **39** server-contract checks · **8** web checks (incl. 320 px width) |
| New phone flows | 4 (`apply-quick`, `application-interview`, `application-offer`, `application-documents`): **all pass on the real Android phone** |
| Decisions recorded | D26 (permissions, confirmations, uploads) · D27 (differences from the website) |
| Cost | Nothing so far. The two test builds (section 6) use EAS build minutes: asked first. |

---

## 2. What the candidate can do

| Action | How it works | Same as the website? |
| --- | --- | --- |
| **Apply chooser** | "Applying for", then three ways: structured form, upload CV, Quick Apply. Already applied? It says so and leads to My Applications. | Yes. |
| **Quick Apply** | One tap with the saved form profile. Needs a profile at least 30% complete. Answers to the job's questions are checked first. | Yes. |
| **Job questions** | Text, long text, number, choice, yes/no. Required ones are checked with the website's messages. | Yes (choices are buttons, not a drop-down). |
| **Apply with your CV** | Name, email, phone (filled in), one PDF or Word file up to 5 MB. Progress bar, Cancel, Try again. The email goes exactly as typed. | Yes. |
| **My Applications** | Count, nine tabs with counts, newest first, status colours, progress steps, last update. Pull down to refresh. | Yes. |
| **Interview** | Date and time in India time, Join Meeting link or venue, interviewer. Accept, Request Reschedule (a note is needed), Decline (asks to confirm first). | Yes, plus the confirm step. |
| **Document request** | Choose files, photos from the gallery, or take a photo. Types and sizes are checked on the phone. Progress, Cancel, Try again. | Yes, plus camera and gallery. |
| **Offer letter** | View it, download or share it, Accept, Reject (asks to confirm first). | Better: the website's "View Offer Letter" opens its home page, not the letter. |
| **Joining** | "Your joining date is ..." and the hospital's note. | Yes. |

Every screen also handles loading, no internet, a server error with "Try Again", and an empty list.

**One limit to know:** a candidate who has never filled the website's 15-step form cannot use Quick Apply or CV upload yet (the website has the same rule).
That form is the profile builder of Phase 4. The Part 1 demo therefore uses a demo account that already has a profile.

---

## 3. Quality

- **Code checks:** 1,171 pass, covering the rules (statuses, dates in India time, file limits, job questions), the data handling (double taps ignored, no repeat
  of an upload, a refused application keeps the uploaded CV), and every screen in every state.
- **Server checks (against a local copy of the live backend):** apply, the three refusals (missing answer, wrong answer, already applied), answering,
  the moves a candidate may and may not make, and that one candidate cannot answer for another.
- **Web checks:** list and tabs, answering an interview, declining and rejecting asking first, Quick Apply from a job, the locked states, and the screens at
  the smallest phone width (no sideways overflow).
- **Found while building, fixed:** the Decline and Reject confirmations did nothing in the web build (the phone's alert has no web version); two of our own
  test helpers changed shared test data and made later tests fail. Neither affects the app.
- **Found on the real phone, fixed:** after applying, the new application was out of sight at the top of My Applications (the list kept its old position). A unit test and the `apply-quick` flow now guard it.
- **Checked on the real phone:** Quick Apply with job questions, the photo picker and upload of a requested document, accepting and rescheduling interviews, the offer letter opening in the browser and accepting the offer.
- **Not checked on a device yet:** the camera permission and taking a photo, the share sheet (download and share the offer letter), CV upload through the file picker: check these three by hand.

---

## 4. Where the app differs from the website (on purpose)

See D27 in `docs/DECISIONS.md`. In short: answers live on their own screen (a phone list would lose typed text); the offer letter opens the letter; Decline and
Reject ask first; status colours follow the status (the website's rule misses some); a closed job shows its closed message; job questions use buttons; only
PDF and pictures for requested documents (the server refuses the rest); errors keep the website sentence and add the server's reason.

---

## 5. Permissions and privacy

- **Android release build:** internet, network state, Wi-Fi state, vibration, camera. Nothing else: no microphone, no storage, no biometrics, no screen overlay.
- **iPhone:** camera and photo-library reasons, in plain words. No microphone, no Face ID.
- Files and photos come from the system pickers, which need no permission. The offer letter is downloaded to the cache to be shared and deleted afterwards.
- Security notes found while building are kept in local notes (`docs/client/`), not in this public repository.

---

## 6. Not done yet, and what it needs

| Item | Needs |
| --- | --- |
| iPhone simulator: the 9 old flows and the new flows that need no file picker | A Mac from GitHub. `smoke` passed on one; seven other attempts waited 15 minutes for a Mac and were cancelled (GitHub's free macOS pool had no machine; no incident reported). Retry at a quiet hour. |
| Check by hand on the phone: camera photo, share the offer letter, CV upload from the file picker | 10 minutes with the phone |
| Android test build (APK) for Raj's and the client's phone | **One EAS preview build.** Raj to say yes. |
| iPhone "build" for the client | The client's Apple account is assumed not active: simulator build plus a screen recording. |
| One real Sentry event from a build, checked for personal data | After the preview build. |
| Part 1 checklist against the contract | PLAN.md's Part 1 list is the list (Raj, 27 Oct). |

---

## 7. Screen recording plan for the client

Record on the Android phone with scrcpy (see `docs/SETUP.md`), portrait, 60 to 120 seconds each, signed in as the demo applicant, notifications hidden.
Reseed first (`npm run backend:local`).

| # | Title | Steps | Show |
| --- | --- | --- | --- |
| 1 | Apply in one tap | Home → Radiology Technician → Apply Now → answer the questions → Quick Apply → My Applications | The choice, the questions, the new row |
| 2 | Apply with your CV | Apply Now → Upload & apply → choose a PDF → Submit | The file picker, the progress bar |
| 3 | Answer an interview | My Applications → Interview Scheduled → open → Accept; another one → Request Reschedule with a note | The India-time date, Join Meeting, the new status |
| 4 | Documents and offer | Documents Requested → add a photo → Upload; Offer Sent → View letter → Accept | Progress, the letter, the status change |
| 5 | When things go wrong | Airplane mode → the offline message → back online → Try Again | Offline and retry |

---

# Technical appendix

## A. What was built

| Area | Files |
| --- | --- |
| API and schemas | `src/features/applications/applicationsApi.ts`; `src/api/schemas/applications.ts`; `candidate.ts` widened; `jobs.ts` gets `customApplicationFields` |
| Rules (pure, unit-tested) | `src/features/applications/logic/` (`status`, `interview`, `apply`, `customFields`, `quickApplyProfile`); `src/features/uploads/logic/files.ts` |
| Uploads | `src/api/createApiClient.ts` (`upload`, transport, progress, cancel), `src/api/xhrUploadTransport.ts`, `src/features/uploads/` (`uploadsApi`, `pickers`, `FilePickerField`, `useUploadTask`) |
| Hooks | `src/features/applications/hooks/` (`useApplications`, `useApplyContext`, `useApply`, `useRespond`) |
| Screens | `ApplyChooserScreen`, `ApplyUploadScreen`, `ApplyFormScreen` (placeholder until Phase 4), `ApplicationsScreen`, `ApplicationDetailsScreen`; routes `apply/[jobId]/{index,upload,form}`, `application/[id]`, tab `applications` |
| Cards | `components/actions/` (`InterviewCard`, `DocumentsCards`, `OfferCard`, `ActionCard`, `CardFrame`) |
| Offer letter | `src/features/applications/offerLetter.ts` (view; download, share, delete the copy) |
| Confirmations | `src/lib/confirm.ts`, `confirm.web.ts` |
| Theme | status pill colours added to `src/theme/tokens.ts` (contrast tested) |

New libraries (all Expo SDK, native): `expo-document-picker`, `expo-image-picker`, `expo-file-system`, `expo-sharing`.

## B. Tests

- Jest: 1,171 tests (Phase 2 had 727). Hook and screen tests run the real client with MSW; uploads run through `src/test/xhrOverFetch.ts`
  (Jest has no `XMLHttpRequest`, so a small stand-in sends through `fetch`, which MSW sees). Stateful test backend: `src/test/msw/applications.ts`.
- Contract (`tests/contract/applications.test.ts`, local backend): 19 new tests; the whole contract run is 39 tests, serial.
- Seed (`scripts/backend-local/overlay/app-scripts/seedData.ts`): a second demo account with a filled profile (94%), eight closed jobs and one application
  per state, job questions on Radiology Technician. Both test candidates reset on every seed. Staging shares the database, so the demo account is there too.
- Playwright: `e2e/web/applications.spec.ts` (7 specs) and `applications-narrow.spec.ts` (1, at 320 px). The web build keeps its session in memory, so the specs
  move around inside the app instead of using `goto`.
- Maestro (not run yet): `apply-quick`, `application-interview`, `application-offer`, `application-documents`; shared `_common/loginApplicant.yaml`.
  CV upload through the system file picker is not automated: the picker is outside the app.

## C. Findings in the website code (for the issues list)

- The offer "View Offer Letter" button links to the website home page, not the letter.
- Status pill colours are chosen from words in the label, so some closed states are green or grey and "Additional Docs Required" is not amber.
- The "job closed" message in the timeline compares against the wrong label and never shows.
- Requested-document picker offers Word files that the server then rejects; oversize CV and document uploads answer 500 instead of 400.

## D. Costs

- EAS: none this phase so far; two builds are waiting for Raj's yes (section 6). GitHub: public repository, free runners.
