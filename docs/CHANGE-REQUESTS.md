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
| CR-001 | Raj, 2026-10-26 (triage item 8) | **OTP-verified phone change.** Changing the mobile number in the profile requires an OTP sent to the new number, and only then replaces the number used for login. Today the profile phone silently replaces the login phone with no check. | **3.5 days**: backend 1.5 (send/verify OTP for change, uniqueness check, rate limit, tests) · website 1 (change-number dialog, error states, tests) · app 1 (same flow, Maestro) | proposed |
| CR-002 | Triage A5 (found 2026-10-26) | **Private candidate files.** CVs, documents and offer letters delivered through signed, expiring links instead of permanent public links. | **3 days**: backend 1.5 (private upload type, signed URL endpoint, migrate existing files, tests) · website 0.5 · app 1 | proposed |
