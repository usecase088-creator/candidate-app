# ApronHanger candidate app: Phase 2 summary

**Phase:** 2 of 5, "Jobs" · **Dates:** 26–27 October 2026 · **Status:** built and tested on Android (9/9 phone flows) and on the iPhone simulator (9/9 flows) · **Prepared for:** Raj and the ApronHanger client

---

## 1. In one minute

Phase 2 added the whole job side of the app. A signed-in candidate can **browse jobs, search and filter them, open a job,
save it for later, see their saved jobs, and open government and international listings.** It uses the same backend and
the same wording as the website. The backend was not changed.

It works on the **real Android phone**: all 9 phone flows pass (the 6 from Phase 1 plus 3 new job flows). The phone found one
real bug that no automated check had caught (text missing on the job screen); it is fixed.

| | |
| --- | --- |
| Screens built | Home (recommended, categories, all jobs) · Search with filters and sort · Job details with similar jobs · Saved jobs · Government jobs · International jobs |
| Automated checks | **727** code checks, **20** server-contract checks, **9** web-browser checks (incl. smallest phone width), **9** Android phone flows |
| Decisions recorded | D23 (where the app differs from the website, and why) and D24 (the new test server) |
| Cost | Nothing. Free tiers only. |

---

## 2. What the candidate can do

| Action | How it works | Same as the website? |
| --- | --- | --- |
| **Browse** | Home shows a "Recommended for you" row with match scores, category chips, and every open job, newest first. Pull down to refresh. | Yes, plus the category chips (see section 4). |
| **Search** | Role or specialty, and city or state, filter the list as you type. | Yes, same matching. |
| **Filter and sort** | City, minimum experience (0 to 15 years), minimum salary (0 to 50 LPA), job type, and sort by latest, salary or profile relevance. Filters stay when you switch tabs. | Yes, same options. |
| **Open a job** | Every section the website shows: hospital, tags, about the role, responsibilities, requirements, perks, about the hospital, pay, experience, applicants, match insight, and up to 4 similar jobs. | Yes. |
| **Save a job** | The bookmark changes at once. If the server refuses, it changes back and says why. | Better: the website waits for the server. |
| **Saved jobs** | List with count, remove with one tap. | Yes. |
| **Government jobs** | Search, deadline colours (amber when 7 days or fewer, red when closed), "View / Apply" opens the official link inside the app. | Yes. |
| **International jobs** | Country chips, search, visa badges, "Apply" opens the link inside the app. | Yes. |

Every screen also handles: loading (placeholder cards), no internet, server error with a "Try Again" button, and no results.
The website shows nothing useful when a list fails to load; the app says what happened.

Nothing was added beyond the agreed scope. Two small extras went to the change list (section 6).

---

## 3. Quality

- **Real phone:** 9 of 9 flows pass on the Realme RMX3944 (about 14 minutes), including browse, save, search and filters,
  government and international links opening the in-app browser.
- **Found on the phone, fixed:** on the job screen the location, job type and posted date were invisible on Android.
  Everything in the automated suites was green. This is why the phone run matters.
- **Smallest phone width (320 px):** home, search, filters and job details do not overflow. The bottom tab "Applications"
  was being cut off (a Phase 1 issue); fixed.
- **Privacy regression checks:** the saved-jobs reply must contain no list of other candidates' applications and no recruiter
  email. Two automated checks (against the local server) fail if the old leak ever returns.
- **Safety:** government and international links are opened only if they start with http or https.

---

## 4. Where the app differs from the website (on purpose)

1. **Category chips.** The website's category row is written but never shown and could not work with real data. The app builds it from the real job categories.
2. **Saving is instant** with automatic undo on failure (the website waits).
3. **Steppers (+/−)** instead of sliders for experience and salary: same ranges, easier to hit, no extra library.
4. **Match score on the job page.** The website never shows it there; the app does when the server has one.
5. **Honest errors.** A failed list shows "Something went wrong" and "Try Again", not an empty page.
6. **"Build my CV" buttons and "Apply Now"** wait for their phases: "Apply Now" says it arrives in the next update.

---

## 5. iPhone

The iPhone version runs on GitHub's cloud iPhone simulator (iPhone SE, iOS 26.2) against the test server (section 7).

- **All 9 flows pass in one run** (run 40495255859, about 25 minutes of test time): sign in, sign up, forgot password, recruiter
  account rejected, session restore, browse and save a job, search and filters, government and international links, and the smoke check.
- **What it took:** every problem was a difference between Android and iPhone in the test scripts, not in the app. The test tool
  cannot close the iPhone keyboard (the scripts press Return instead); Return on a password field already signs in; iPhone shows its
  own "Save Password?" sheet and a strong-password suggestion that swallows typing; the iPhone keychain survives a reinstall
  (each flow now starts on a freshly installed app with an empty keychain); a few fields hide behind the keyboard.
  The app itself needed no change.
- **GitHub minutes:** the first runs ran while the repo was private (about 8 macOS minutes, counted 10x, so about 80 of the 2,000
  free minutes). After the repo became public every run is free.
- **Cost on EAS:** 1 free iOS simulator build.

---

## 6. What needs your decision

| Item | Why |
| --- | --- |
| **Repo is now public** (Raj, 2026-10-27) | It makes GitHub's iPhone test minutes free. It also publishes the client's backend copy in `staging-backend/` (including the unfixed file-link weakness A5) and the docs. Options: keep as is, or move staging to a separate private repo. |
| **CR-004** Jobs kept after a restart with no network | 1 day, app only |
| **CR-005** Working category filter on the website | 0.5 day, website only |
| A5 (public document links), A2, B8 | Unchanged from the hand-off |

---

## 7. Test server (new)

A staging backend now runs on Raj's own Render account: `https://apronhanger-staging-api.onrender.com` (free plan, so the
first request after a pause takes about 50 seconds). It runs the same code as the live site (including the two security
fixes) with a test login code. It shares the development database. The live server was never touched: Raj's other free
service in that workspace was paused to stay inside the free hours.

---

## 8. Screen recording plan for the client

Record on the Android phone with scrcpy (see `docs/SETUP.md`), against the local backend or staging, portrait, 60 to 120
seconds each. Restart the local backend first (it resets saved jobs), sign in beforehand, and hide notifications.

| # | Title | Steps | Show |
| --- | --- | --- | --- |
| 1 | Find and save a job | Home → scroll the recommended row → category chip "Doctors" → open "Consultant Cardiologist" → Save → back → Saved jobs | Match scores, instant save, saved list |
| 2 | Search and filter | Search tab → type "nurse" → city "Karnataka" → Filters: Locum, salary +, sort by salary → switch tab and back | Filters kept across tabs, counts "Showing n of m" |
| 3 | Government and international | Home → Govt Jobs (deadline colours, search) → "View / Apply" opens the browser → International Jobs → UAE chip → Apply | In-app browser, deadline and visa styling |
| 4 | When things go wrong | Airplane mode on → Home shows the offline message and banner → back online → Try Again | Offline and retry |

Tip: flows 1 to 3 can be recorded while the matching Maestro flow runs: `jobs-browse-save`, `jobs-search-filters`,
`jobs-gov-intl`.

---

# Technical appendix

## A. What was built (all in `src/features/jobs/` unless noted)

| Area | Files |
| --- | --- |
| API and schemas | `jobsApi.ts`; `src/api/schemas/jobs.ts`, `candidate.ts` (Zod, loose objects, defaults for lists) |
| Logic (pure, unit-tested) | `logic/filter.ts` (search, filters, sort), `match.ts` (port of the website's matching), `format.ts`, `deadline.ts`, `gov.ts`, `intl.ts` |
| State | `filterStore.ts` (Zustand; reset on sign-out in the root layout); TanStack Query keys in `hooks/queryKeys.ts` |
| Hooks | `hooks/useJobsData.ts`, `hooks/useSavedJobs.ts` (`useToggleSave`: optimistic, per-job rollback, 409/404 treated as already done, double taps ignored), `hooks/queryView.ts` |
| Screens | `screens/HomeScreen`, `SearchScreen`, `JobDetailsScreen`, `SavedJobsScreen`, `GovJobsScreen`, `IntlJobsScreen`; routes in `src/app/` (`job/[id]`, `saved-jobs`, `gov-jobs`, `intl-jobs`, tabs `index` and `search`) |
| Components | `JobCard` (not one big button, so TalkBack can reach Save), `FilterSheet`, `RecommendedRail`, `CategoryChips`, skeletons; `Chip` and `Stepper` in `src/components/ui/` |
| Guard | `src/features/auth/RequireSession.tsx` for routes outside the tabs |

New dependency: `@shopify/flash-list` 2.3.2 (JavaScript only, no native rebuild).

## B. Tests

- Jest: 727 tests (Phase 1 had 488). Screen tests run the real routes with MSW (loading, error, empty, offline, success).
- Contract (`tests/contract/jobs.test.ts`, local backend): jobs with and without a token, details, similar query, saved
  save/list/409/unsave/404, **no `applications` list and no recruiter email** in the saved-jobs reply, 401 without token.
  The contract run is serial (`maxWorkers: 1`) because the auth file resets the seeded password.
- Playwright: `e2e/web/jobs.spec.ts` (4 specs × 2 profiles), `jobs-narrow.spec.ts` (320 px).
- Maestro: `jobs-browse-save`, `jobs-search-filters`, `jobs-gov-intl`, shared `_common/login.yaml` and `_common/hideKeyboard.yaml`.
- Seed (`seedData.ts`): 4 gov and 2 international listings in every deadline state; saved jobs of the test candidate are cleared on each seed.

## C. Findings in the website code (for the issues list)

- `CategoryRail.tsx` is never rendered; its ids can never equal `Job.category` values (CR-005).
- Job details loader sends no token, so the website never shows the match score.
- `formatExp` prints NaN for missing numbers; save is not optimistic; lists have no error state.
- State matching uses `job.city || job.location`, so a job with a city never matches on the candidate's state.

## D. Decisions and config changes

- D23 (differences from the website), D24 (staging server).
- `app.config.ts`: the live-server guard now blocks only `job-ojsr.onrender.com` and `apronhanger.work`.
- `eas.json`: `e2e-test` sets `API_URL_OVERRIDE` to the staging URL.
- `.github/workflows/ios-e2e.yml`: default flows are the whole folder; wakes staging first.

## E. Costs

- EAS: 1 iOS simulator build (free plan) for this phase.
- GitHub macOS: see `docs/HANDOFF.md` for the minutes used (a run is about 5 to 15 minutes, counted 10× on a private repo).
- Render: free plan only.
