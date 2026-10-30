# By-hand checklist for Raj (Stage 1.8): what Maestro cannot prove

Use the **release** build (local `app-release.apk`, preview variant → staging) on the Realme, signed in as
`applicant@apronhanger.test` (password in `seedData.ts`). Reseed first: `npm run backend:local -- --no-start --source ../job-hotfix/backend`
(staging shares the database). Tick, note the date, and write anything odd next to the line.

## Native pickers and files
- [ ] Document request → **Take a photo**: camera permission prompt names the feature; a photo uploads; denying the permission still lets "Choose from gallery" work
- [ ] Document request → **Choose from gallery**: the system photo picker opens (no "allow access to all photos" prompt); one image uploads
- [ ] Apply with CV → **file picker**: a PDF uploads with a progress bar; Cancel stops it; a 6 MB file is refused on the phone with the website's message
- [ ] My CV → **CV PDF**: preview shows; "Download or share" opens the share sheet; the PDF opens in another app
- [ ] Offer letter → **View** opens it; **Download or share** opens the share sheet
- [ ] Profile photo: camera and gallery; **Remove** asks first

## Profile builder
- [ ] **Date picker** (Android dialog): a work date in the future is refused; an optional date can be cleared; the stored value shows as DD/MM/YYYY (website format) after save
- [ ] Kill the app on step 8, reopen: it resumes on the same step with the typed values
- [ ] Save profile with airplane mode on: error with Retry; switch it off, Retry succeeds; nothing is uploaded twice (check the vault)

## Push
- [ ] First application ever on this phone: the "turn on notifications?" question comes **after** the application, not at launch; "Not now" is remembered
- [ ] Settings → Notifications on: the system prompt; a real push arrives when the demo hospital changes a status (needs `EXPO_PUSH_ENABLED=true` on staging: it is) and tapping it opens the right application
- [ ] Notifications denied in system settings: the app still works; Settings shows the state

## Links and the bell
- [ ] An email link `https://apronhanger.work/applications` opens the browser today (assetlinks.json not published yet): expected until B15
- [ ] Bell shows the unread count; "99+" above 99; Mark all as read clears it

## Account
- [ ] Settings → Delete account: wrong password shows "Incorrect password"; right password deletes, the app signs out, the number can sign up again
- [ ] Sign out, sign in again, kill the app, reopen: still signed in (refresh token)
- [ ] Put the phone's clock 2 hours ahead, reopen: the app recovers to the home screen, never a blank screen

## Layout and accessibility
- [ ] `adb shell wm density 540` (320 dp) and `adb shell settings put system font_scale 2.0`: login, home, job details, apply chooser, application card, profile builder step, notifications, settings. **Restore:** `adb shell wm density 480` and `font_scale 1.0`
- [ ] Dark mode on: the app stays light and readable
- [ ] TalkBack on: login → home → a job → Apply → back; every control reads a label
- [ ] Edge-to-edge: nothing under the status bar, navigation bar or keyboard (login, profile builder, application card with the reschedule box)
- [ ] Back gesture on every screen: modals, the apply chooser, the date picker, the profile builder (does not lose the draft)
- [ ] Tablet / foldable (if available, 600 dp+): landscape does not break the home feed or the builder

## Network
- [ ] Airplane mode while the feed loads: offline message with Retry, not an empty list
- [ ] Staging asleep (first request after 15 min): the "warming up" state shows and the feed arrives within about 60 s
