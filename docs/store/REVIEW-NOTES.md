# Review notes for both stores (Stage 4.7)

Paste into App Store Connect "App Review Information → Notes" and Google Play "App access → Any other instructions".
Fill the demo login from `DEMO-ACCOUNT.md` (never commit the password). Same build and same features for reviewers and
users: no hidden features, no review-only mode (Apple 2.3.1 / 2.5.19).

```
ApronHanger is the candidate app of apronhanger.work, a job portal for healthcare professionals (nurses, doctors,
paramedics, hospital staff) in India. Hospitals post jobs on the website; candidates browse, build a profile and CV,
apply and follow their applications in this app.

DEMO ACCOUNT (please use it; creating a new account needs an Indian mobile number that receives an SMS one-time code)
  Email:    <demo email>
  Password: <demo password>
Sign in on the first screen with the email and password tab. The demo account already has a profile, a CV, saved jobs
and applications in every state (applied, interview scheduled, documents requested, offer, joined).

WHERE THINGS ARE
  Home tab: job feed with filters; tap a job for details and "Apply".
  Search tab: search by role, specialty, city. Government jobs and international jobs open from the home screen.
  Applications tab: every application; tap one to see the hospital's interview, document request or offer and answer it.
  Profile tab: Edit profile (step-by-step builder), My CV (preview, download, share as PDF), Settings.
  Bell (top right): notifications.
  Settings: Notifications on/off, Privacy Policy, Terms and Conditions, Delete account, Sign out.

PERMISSIONS
  Camera: only when you choose "Take a photo" for a requested document. Photos and files come from the system pickers.
  Notifications: asked once after the first application, or from Settings. The app works fully without them.

ACCOUNT DELETION
  Settings → Delete account (password asked again). Also available signed out at
  https://apronhanger.work/delete-account.html. Applications already sent to hospitals stay in their records without the
  candidate's name or files, as explained on the deletion screen and in the privacy policy.

GOVERNMENT JOBS
  ApronHanger is not a government app and is not affiliated with any government body. The "Government Jobs & Exams"
  screen lists public notifications and links to the official websites of the authorities. It says so on the screen.

SIGN-UP
  Sign-up needs an Indian mobile number: an SMS one-time code is sent to it. If you need to test sign-up, tell us and we
  will provide a number, or use the demo account above.

Support: <support email>, <support phone>.
```

Keep the demo account and the backend unchanged while a review is open. If rejected: reproduce on the submitted build with the demo account, then reply in the console with what failed, what changed and how to see it (Stage 6.4).
