# Phase 2 — Jobs (week 2)

Goal: a signed-in candidate can browse the home feed, search and filter jobs, open a job, save and unsave it, see saved jobs, and
open government and international listings. Android phone against the local backend; iPhone simulator once at the end.

Work through the tasks in order. Each task: test first, then code, then `npm run check`, then a small commit.
Tick the box when a task is done. Raj asked for no pause between tasks: stop only when blocked, when something fails that
can't be fixed, or at the end of the phase.

Scope is exactly `docs/PLAN.md` "Phase 2". Anything else goes to `docs/CHANGE-REQUESTS.md` (Task 11).
Non-goals: apply flow, applications, profile builder, push, backend changes, store builds, paging (the server returns up to 50).

Source of truth: the website (`../job/candidates/src`, now at `f185fe0`), `docs/reference/API.md` §10–16,
`docs/reference/SCREENS.md` §3–7. Where the website and SCREENS.md differ, the code wins (see "Findings" below).

## Findings from reading the website (2026-10-26)

1. **The categories rail does not exist on the website's home page.** `CategoryRail.tsx` is never rendered, and its ids
   (`doctors`, `nurses`) could never match real data: `Job.category` holds the recruiter's role type
   ("Nursing Professionals & Paramedics", ...). PLAN.md lists a categories rail, so the app builds one from the **real
   `category` values of the loaded jobs** (distinct values, plus "All Roles"). Wording "All Roles" is the website's.
2. **The website has no error state on lists** (a failed fetch looks like "no jobs"). Raj's rule is that every screen handles
   error, so the app shows the website's "Something went wrong" + "Try Again" instead. App wording, as in Phase 1.
3. The website's job details page loads without a token, so it never shows the match score. The app's client always sends the
   token, so "Your profile matches {n}% of this role's criteria." shows when the server returns `matchPercent`.
   Same sentence, the intended behaviour of the website code.
4. The website's save is **not optimistic**. PLAN.md and Raj ask for optimistic update with rollback: the icon changes at once;
   on failure it goes back and the website's error text is shown ("Failed to save job" / "Failed to remove saved job", or the
   server message). `409 Job already saved` and `404 Saved job not found` mean the state the user wanted is already true, so
   they are not rolled back.
5. The website's home banner ("Build your ApronHanger CV in one go") and the "Unlock personalised recommendations" button
   lead to the CV builder, which is Phase 4. Phase 2 shows the "Unlock personalised recommendations" text without the
   button; both come with the profile builder.
6. The website's filter sidebar ranges: experience slider 0–15 step 1, salary slider 0–50 step 2, job types
   Full-time / Locum / Part-time / Contract, sort: Latest roles / Salary high to low / Profile relevance. Same in the app
   (steppers instead of sliders: no new native library; sliders are hard to hit on small phones).

## Task 0 — Reference sync (done before this file)

- [x] `../job` fetched and fast-forwarded to `f185fe0` (live commit). Recorded in D6.
- [x] `npm run backend:local` starts; 12 contract tests pass against it.
- [x] `@shopify/flash-list` 2.3.2 installed with `npx expo install` (JS only, no native rebuild).

## Task 1 — Schemas, fixtures, endpoints (TDD)

- [ ] `src/api/schemas/jobs.ts`: full `Job` (everything the screens show: category, city, experienceMin/Max, experience,
      postedDays, tags, description, responsibilities, requirements, perks, hospitalLogoUrl, hospitalVerified, hospitalAbout,
      applicants, status, matchPercent?), `.loose()`. `SavedJob = { savedAt, job }`; `SavedJobList`; gov and intl with
      `createdAt`, `experience`, `qualification`, `license`. Unit tests with fixtures, including a missing required field.
- [ ] `src/features/jobs/jobsApi.ts`: `list`, `get(id)`, `similar(category, excludeId)` (`?category=&excludeId=&limit=4`),
      `savedList`, `save(jobId)`, `unsave(jobId)`, `govList`, `intlList`. MSW tests for URL, query and parsing.
- [ ] Candidate profile for matching: `GET /api/candidates/me` parsed loosely (role, yearsExperience, city, state,
      preferredLocations, skills, completeness, cvSource); a minimal profile for uploaded CVs like the website.
- [ ] Contract tests (local backend): jobs list (with and without token: `matchPercent`), `GET /api/jobs/:id`, similar,
      save → list → unsave, gov, intl. **Saved-jobs response has no `applications` list and no `postedBy`** (A1 regression).
      Public list has no `postedBy.email` (A4 regression).

## Task 2 — Pure logic (TDD, `src/features/jobs/logic/`)

- [ ] `format.ts`: `formatLPA`, `formatExp`, `postedLabel` ("Today" / "{n}d ago"), same output as the website.
- [ ] `filter.ts`: `jobMatchesSearch` (role, specialty, hospital, location, city, category, type, tags, description with HTML
      stripped; city matches `city + location`; lower-case `includes`), filters (cities, minExp, minSalary, types), category,
      sort (latest by `postedDays`, salary by `salaryMax`, relevance by `matchPercent`), `activeFilterCount`, `DEFAULT_FILTERS`.
- [ ] `match.ts`: port of `rolesMatch`, `scoreJobMatch`, `isLocationMatch`, `computeJobMatches` (top 5, ≥ 55, location rule;
      without a profile ≥ 20% it uses the server's `matchPercent`).
- [ ] `deadline.ts` for gov and intl: `formatDate` (en-IN), `daysLeft`, `isExpired`; amber at ≤ 7 days, red when expired.
- [ ] `govFilter.ts` / `intlFilter.ts`: search and country list. Visa badge colours.

## Task 3 — Data hooks (TDD)

- [ ] TanStack Query hooks: `useJobs`, `useJob(id)`, `useSimilarJobs`, `useSavedJobs`, `useGovJobs`, `useIntlJobs`, `useMyProfile`.
- [ ] `useToggleSave`: optimistic update of the saved list, rollback on error, toast text, 409/404 rule, no double taps.
- [ ] Filter state in a Zustand store (`filterStore`) so search text, city, filters, sort and category stay when switching tabs
      and are reset on sign-out.

## Task 4 — Components (TDD, in `src/features/jobs/components/` and `src/components/ui/`)

- [ ] `JobCard` (logo via expo-image or building icon, hospital, verified badge, location, save icon, role, specialty, 3 pills,
      posted, match ring, "View Details"), `MatchRing` (no new native library), `SaveButton` (icon and button variants),
      `JobCardSkeleton`, `VerifiedBadge`, `FilterSheet`, `CategoryChips`, `RecommendedRail`.
- [ ] Every pressable has a `testID` and `accessibilityLabel`; layouts checked at 320 pt width and font scale 2.0.

## Task 5 — Home (TDD)

- [ ] Home tab: greeting search bar (opens Search), recommended rail, categories rail, "All Opportunities" /
      "Showing {n} of {total} verified roles", links to Saved, Government and International jobs. FlashList.
- [ ] States: skeleton loading, error + "Try Again", empty ("No open positions yet" / "No matches"), offline (banner + cached
      data kept), pull to refresh.

## Task 6 — Search (TDD)

- [ ] Search tab: text and city fields, filter sheet (cities, experience, salary, job types, sort, reset, "n active"),
      category chip, results list with the same counts and empty texts. Filters kept across tabs.

## Task 7 — Job details and similar jobs (TDD)

- [ ] Route `job/[id]`: all sections of the website (header, tags, About the role with HTML shown as plain formatted text,
      Responsibilities, Requirements, Perks & benefits, About {hospital}, Compensation card, Match insights, applicants line),
      "Apply Now" (arrives in Phase 3: shown disabled with the website's label only when closed, otherwise opens nothing yet:
      see note below), Save button, Similar opportunities (up to 4). "Job not found" + "Browse opportunities".
- Note: "Apply Now" needs the apply flow (Phase 3). In Phase 2 the button is shown and tells the user it is coming in the next
  update, so no dead tap. It is wired in Phase 3 Task 1.

## Task 8 — Saved jobs (TDD)

- [ ] Route `saved-jobs`: title, count ("{n} role(s) bookmarked for later"), "Browse opportunities →", list, empty
      ("No saved jobs yet" / "Tap the bookmark icon on any job to save it here." / "Find opportunities"), error, offline.
      Unsaving from the list removes the card at once (optimistic) and rolls back on error.

## Task 9 — Government and international jobs (TDD)

- [ ] Routes `gov-jobs` and `intl-jobs`: hero text, stats, search, country chips (intl), cards instead of the website's wide
      table, deadline styling, visa badges, "View / Apply" and "Apply" open the outside link in `expo-web-browser`;
      disabled when expired; only http(s) links are opened. Empty, no-match, error, offline.

## Task 10 — End-to-end

- [ ] Maestro on the real phone (local backend): `jobs-browse-save.yaml` (home → open job → save → saved list → unsave),
      `jobs-search-filters.yaml` (search text, filters, sort, category), `jobs-gov-intl.yaml` (lists open, link opens the browser).
      Seed: enough jobs for filters, a gov and an intl listing (`scripts/backend-local/overlay/app-scripts/seedData.ts`).
- [ ] Playwright (Chromium, API mocked): home list, search with filter, job details, save with rollback.
- [ ] Whole existing Maestro suite still passes.
- [ ] iPhone simulator (GitHub macOS runner), once at the end: auth flows and the new job flows. See "iOS" below.

## Task 11 — Close the phase

- [ ] Parity checklist with the website job screens (below), `npm run check` green, coverage gates met.
- [ ] `docs/PHASE-2-SUMMARY.md` (plain language + technical appendix + screen recording plan), `HANDOFF.md`, `CLAUDE.md`
      "Current phase", `docs/DECISIONS.md` (D23+), `docs/CHANGE-REQUESTS.md`.

## iOS (once, at the end)

The GitHub workflow `ios-e2e.yml` uses the latest finished EAS `e2e-test` iOS simulator build (free plan) and a backend the
cloud can reach. Today only the smoke flow runs there because no staging server exists (D4). To run the auth and job flows
the runner needs a backend; options are written up in the summary if this cannot be done without Raj. GitHub macOS minutes
count 10x; the number used is reported at the end.

## Rules for every task

- TDD, `npm run check` before each commit, conventional commits, no `any`, no `fetch` outside the API client.
- Email is sent exactly as typed (no lowercasing) wherever it is sent.
- Saved jobs use the fixed response (`{ savedAt, job }`, `job.applicants`, no `applications`).
- 8 GB laptop: never run the emulator, Expo web, Playwright and the backend all at once. Stop what was started.
- No personal data in logs or Sentry; job text is public data but candidate data is not.
- Never `PUT /api/candidates/me` in this phase (group B 19 does not come up).

## Phase 2 exit checklist

- [ ] All tasks ticked; `npm run check` green; coverage gates met
- [ ] Contract tests pass (incl. saved-jobs has no `applications`); drift check passes on production (GET only)
- [ ] Maestro: all auth flows and the 3 job flows pass on the real Android phone
- [ ] Playwright job specs pass
- [ ] iPhone simulator run reported (or the blocker, with options)
- [ ] Parity checklist with the website done; `HANDOFF.md`, `CLAUDE.md`, `DECISIONS.md`, `CHANGE-REQUESTS.md` updated
- [ ] Screen recording plan written (`docs/PHASE-2-SUMMARY.md`)
