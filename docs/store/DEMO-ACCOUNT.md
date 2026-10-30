# Reviewer demo account plan, production (Stage 4.6)

Needs Raj (production data) and the client (a demo hospital). Nothing here has been created: the production database is
off limits to this project (CLAUDE.md), so the demo content must be created through the website/admin by the client or by
Raj with the client's OK. The staging equivalent already exists (`applicant@apronhanger.test`, seeded by `seedApp.ts`) and
is the template.

## What to create on production

1. **Demo hospital** (recruiter account owned by the client): "ApronHanger Demo Hospital", a fictional address, approved by admin.
2. **Jobs** posted by that hospital (6 to 8): staff nurse, ICU nurse, medical officer, lab technician, physiotherapist, pharmacist; realistic salary and city; two with job questions (one select, one yes/no).
3. **Demo candidate**: email `demo.candidate@apronhanger.work` (client's domain; mailbox optional), a mobile number the client controls (OTP sign-up needs a real Indian number once; afterwards reviewers only sign in with the password), password set by Raj and stored only in the store review notes and `docs/client/` (git-ignored).
4. The candidate's profile filled through the app's profile builder (≥ 30% completeness so Quick Apply works), a profile photo, a CV, two documents in the vault.
5. **Applications in every state**, made by the demo candidate through the app and moved by the demo hospital through the website:
   - applied (new)
   - shortlisted / under review
   - interview scheduled (future date, venue and a meeting link)
   - documents requested (one request still open)
   - offer made (offer letter PDF uploaded by the hospital)
   - joined
   - rejected
   - job closed
6. A few **notifications** for the candidate (the states above generate them) so the bell has a count.
7. **Saved jobs:** two.

## Hide it from real candidates afterwards

- Close (or mark filled) every demo job after the applications exist, so real candidates never see them in the feed.
- **Check:** after closing, sign in as the demo candidate on a clean install and confirm My Applications still shows every application with its card, the saved-jobs list still shows the jobs (closed jobs show the closed message, D27.5), and job details of a demo job still open from an application. If a closed job disappears from an application, keep one demo job open and unlisted instead (ask Raj how the website hides a job).
- Keep the demo account alive and unchanged while a review is open (Stage 6.3). Do not reseed, delete or rename it.

## For the store forms

- Google Play "App access": username = the demo email, password, plus the instruction text in `REVIEW-NOTES.md`.
- Google pre-launch report credentials: same account (Test and release → Pre-launch report → Settings).
- App Store Connect "App Review Information → Sign-in required": same account.

## Rotation

Change the demo password after each review is approved; update both consoles.
