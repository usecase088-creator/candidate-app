# Handoff (written 2026-10-26, end of the Phase 1 + security hotfix session)

Read this first in a new session, then `CLAUDE.md`. Short and exact on purpose.

## Where we are

- **Phase 1 is accepted** (login, signup, reset, test layers, EAS project; D1–D20). Summary: `docs/PHASE-1-SUMMARY.md`.
- **Security hotfix, free, on the live website backend (D21).** Done in the separate clone `../job-hotfix`; Raj reviewed, merged and deployed:
  - **PR 1** (A1 saved-jobs leak + A4 recruiter email in the public job list): fix commit `08cd1ea`, merged as `5b569f1`. Live.
  - **PR 2** (A3 unfiltered `PUT /api/candidates/me`, allow-list): fix commit `1373342`, merged as `f185fe0`. **Live commit on Render: `f185fe0`**
    (service `job`, branch `conflict-resolution1`, Auto-Deploy on, root directory `backend`).
  - Production abuse check for A3 (D22, read-only, run twice): clean. Details in `docs/client/ISSUES-TRIAGE.md` (status table).
- **Reference clone `../job` is still at `3fa6885`** (read-only, not synced). It does **not** contain the two hotfix merges.
  `../job-hotfix` (branches `hotfix/saved-jobs-privacy`, `hotfix/candidate-profile-allowlist`; its local `conflict-resolution1` is old,
  `git fetch origin conflict-resolution1` gets `f185fe0`) is the clone that matches production. Phase 2 step 2 brings the reference up to date.
- `docs/PHASE-2.md` does **not exist yet**. It is written first in Phase 2 and shown to Raj before any building.

## Hotfix status

| Item | Status |
| --- | --- |
| A1 saved-jobs leak | Done, live (PR 1) |
| A4 recruiter email in public list | Done, live (PR 1) |
| A3 unfiltered profile save | Done, live (PR 2) |
| **A5** public Cloudinary links; recruiters see candidates' documents in search | **PARKED.** Fix before the week-4 backend work and before store submission. Waiting for the client's answer: should recruiters see documents in search at all? (CR-003; private links = CR-002) |
| A2 self-verify | Untouched. Product decision pending (admin-only, or leave) |
| B8 profile phone replaces login phone | Untouched |
| Group B additions (19–21): profile + CV link together returns 500 (dormant), avatar id client-controlled, offer-letter link any text | Listed in the triage, not fixed |

## Rules in force

- `../job` is **read-only**: never edit, commit, push, stash, checkout, reset there.
- Backend changes are made **only in `../job-hotfix`, on a branch**, only after Raj says so. **Raj merges and deploys.** Never push to
  `conflict-resolution1`. Branch from the commit that is actually live on Render (check with the read-only Render API, `RENDER_API`, GET only).
- **Never create or change anything on Render** (services, deploys, settings, env vars). GET on services/deploys/logs only.
- **Never use the production database URL again**, not even read-only, unless Raj says so. D22 was a one-time exception and is **closed**.
  `../job/backend/.env.txt` holds production secrets: do not open it.
- Scope guard: build only what is in `docs/PLAN.md`; extras go to `docs/CHANGE-REQUESTS.md` with a day estimate; **security holes found while
  reading go to `docs/client/ISSUES-TRIAGE.md` first, nothing is fixed without Raj's OK.**
- `docs/client/` is git-ignored on purpose (triage, issues list, PR bodies, SQL checks): local only, never commit it.
- Never commit secrets. Tokens pasted in chat earlier (Expo, GitHub, Render staging) should be revoked by Raj.

## Open items for Raj

1. **Sentry DSN**: Raj gives it; it goes into `.env.local` (`EXPO_PUBLIC_SENTRY_DSN`) and an EAS environment variable (preview + production), never committed.
   Then one test event from a dev build, checked for personal data.
2. **Staging backend in Raj's own Render account** (not the client's workspace, D4). Needed by week 3. Until then the app uses the local backend
   (`npm run backend:local`) and no staging exists; `npm run staging:deploy` stays unused.
3. **Tell the client** about A1, A3 and A5, and ask the A5 question (documents in search: keep or hide?). The triage and CR-003 have the text.
4. **Production on a paid always-on Render instance before store submission** (week 7). Free plan sleeps, ~50 s cold start. Client's cost (PLAN.md, D4).
5. **Read-only Neon role** (created by Raj) if a production check is ever needed again.
6. Questions for Raj: are candidates `56ef4dbe-…` and `6399cd5d-…` his own test accounts (closes the legacy `matchPercent` note)?
   Decide A2 (admin-only or leave) and B8. Ask whether to commit/convert `docs/PHASE-1-SUMMARY.md`.

## Next step: Phase 2 (steps in this order)

1. **Triage update**: confirm the triage status table is current (A5 parked) and that nothing new from the hotfix is missing.
2. **Reference sync**: bring the reference (`../job`, read-only, still `3fa6885`) and `docs/reference/API.md` in line with live `f185fe0`
   (saved-jobs now returns only `applicants`, public job list has no `postedBy.email`, `PUT /api/candidates/me` ignores unknown keys). Ask Raj before
   updating `../job` (a pull there is a write); `../job-hotfix` already has the code.
3. **Write `docs/PHASE-2.md` and show it to Raj before building.** Same rules as Phase 1 (TDD, `npm run check`, small commits), plus Raj's additions:
   iOS simulator runs the auth flows and the new job flows; the email is sent exactly as typed;
   saved jobs uses the fixed response (`{ savedAt, job }` with `applicants`, no `applications`); staging is created by Raj in his own Render account later.
   Do not send `profile` + `cvUrl` together in one `PUT /api/candidates/me` (group B 19).
   Then build.
