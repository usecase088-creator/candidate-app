# Change requests

Anything beyond the agreed scope (`docs/PLAN.md`) that Raj or the client ask for goes here, with an estimate in
developer days. **Nothing here is built until Raj approves it as a paid change** (CLAUDE.md, Scope guard).

Website bugs are not change requests: only security/privacy bugs (group A of the triage) are fixed free, with Raj's OK;
the rest are listed in `docs/client/ISSUES-TRIAGE.md` and Raj decides. Improvements found there are proposed as change
requests below once Raj wants to offer them to the client.

## How to add one

| Field | Content |
| --- | --- |
| ID | CR-001, CR-002, ... |
| Asked by / date | who asked, when |
| What | one or two sentences, in business terms |
| Why it is outside the plan | what PLAN.md says (or doesn't) |
| Estimate | developer days, incl. tests (website + backend + app, listed separately) |
| Status | proposed · approved (paid) · rejected · built |

## Requests

| ID | Asked by / date | What | Estimate | Status |
| --- | --- | --- | --- | --- |
| CR-001 | Raj, 2026-10-26 (triage item 8) | **OTP-verified phone change.** Changing the mobile number in the profile requires an OTP sent to the new number before it is used for login. | **3.5 days**: backend 1.5 (send/verify OTP for change, uniqueness check, rate limit, tests) · website 1 (change-number dialog, error states, tests) · app 1 (same flow, Maestro) | proposed |
| CR-002 | Triage (found 2026-10-26) | **Signed, expiring links for candidate files.** CVs, documents and offer letters delivered through signed, expiring links. Background in the local notes (`docs/client/`). | **3 days**: backend 1.5 (private upload type, signed URL endpoint, migrate existing files, tests) · website 0.5 · app 1 | proposed |
| CR-003 | Triage (client decision, 2026-10-26) | **Who sees candidate documents.** Question for the client about which documents recruiters may see before a candidate applies. Details in the local notes (`docs/client/`). | **No cost for the decision**; signed links are CR-002 (3 days) | awaiting client answer |
| CR-004 | Phase 2 (found 2026-10-26) | **Jobs available offline after a restart.** Today cached jobs stay while the app is open; after a restart with no network the lists show "You're offline". Persisting the query cache would keep the last jobs and saved jobs. | **1 day** (app only: persisted cache, size and sign-out clearing, tests) | proposed |
| CR-005 | Phase 2 (website finding) | **Working category filter on the website.** The website's home page has a category rail component that is never shown and whose ids cannot match real jobs. The app builds its rail from real categories; the website could do the same. Website-only. | **0.5 day** (website) | proposed |
| CR-006 | Phase 4 plan (2026-10-28) | **Date and place pickers in the profile builder.** Date picker, city/state lookup instead of typed text (website uses plain text). | **1.5 days**, app only, needs one native library (ask first) | **Date picker part: asked for by Raj on 2026-10-30 and built** (`@react-native-community/datetimepicker` 9.2.1; billable or not: Raj decides). City/state lookup: still proposed. |
| CR-007 | Phase 4 plan | **Push settings by type** (job alerts, application updates) and quiet hours. | **2 days**: backend 1 · app 1 | proposed |
| CR-008 | Phase 4 plan | **Email/SMS fallback** when a user has no push token. | **1.5 days**, backend | proposed |
| CR-009 | Phase 4 plan | **Admin screen for app flags and minimum version** (plan: endpoint fed from environment variables). | **2 days** | proposed |
| CR-010 | Phase 4 plan | **Account deletion with a 30-day undo** (plan: immediate delete with confirm + password). | **1.5 days** | proposed |
| CR-011 | Phase 4 plan | **"Download my data" export.** Not required by the stores; India's DPDP Act may want it: ask the client. | **2 days** | proposed |
| CR-012 | Phase 4 plan | **Device list / "log out other devices".** | **1.5 days** | proposed |
