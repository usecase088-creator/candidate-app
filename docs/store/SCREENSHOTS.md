# Screenshot plan (Stage 4.5)

Taken from the **real release build**, signed in as the demo candidate (`DEMO-ACCOUNT.md`), never the login screen first.
Sizes are the ones on the official pages on the day of upload (`STORE-RULES.md`, read 2026-10-31):

- **Apple:** required: iPhone with Dynamic Island (medium display) 1179 × 2556 or 1206 × 2622 (portrait). Also upload the
  large display set 1290 × 2796 or 1320 × 2868 so nothing is scaled. PNG or JPEG, no alpha, 1 to 10 per size. No iPad set.
- **Google:** 2 to 8 phone screenshots, JPEG or 24-bit PNG (no alpha), each side 320 to 3840 px, long side at most 2× the
  short side (a 1080 × 2400 phone capture is fine). Feature graphic 1024 × 500 (JPEG/PNG, no alpha). Icon 512 × 512 PNG.

## The eight shots, in order (same set for both stores)

| # | Screen | State to set up | Caption (overlay text, short) |
| --- | --- | --- | --- |
| 1 | Home job feed | demo account, feed with real-looking hospital jobs, match score visible | "Hospital jobs, matched to your profile" |
| 2 | Job details | a job with salary, location, requirements, Apply button | "Everything about the job on one screen" |
| 3 | Apply chooser / Quick Apply | the apply sheet with Quick Apply enabled | "Apply in one tap" |
| 4 | My Applications | list with several states (Interview, Offer, Documents requested) | "Track every application" |
| 5 | Application: interview card | interview scheduled with date, venue, Accept / Reschedule | "Answer the hospital from your phone" |
| 6 | Profile builder step | a filled step (experience or qualifications) | "Build your profile once" |
| 7 | CV preview | generated CV | "Your CV, ready to share" |
| 8 | Government jobs | list with the disclaimer visible | "Government and international openings" |

## How to capture

- Android (Play): release build on a 1080 × 2400 phone, `adb exec-out screencap -p > shot.png` (Realme blocks screenrecord, not screencap). Status bar: use the phone's demo mode (`adb shell settings put global sysui_demo_allowed 1`, then `adb shell am broadcast -a com.android.systemui.demo -e command enter`) for a clean clock and full battery.
- iPhone (App Store): TestFlight build on a real iPhone (Stage 5.3) at the medium Dynamic Island size, or the EAS simulator build on an iPhone 16/17 simulator in the GitHub macOS workflow (`ios-e2e.yml` already saves `end-<flow>.png`); scale/export to the exact pixel sizes above.
- Overlay captions and device frames optional; if used, keep the real UI unobscured (Apple: "highlight the user experience, not obscure it").
- Feature graphic: logo + "Healthcare jobs in India" on the brand blue `#208AEF`; no store badges, no ranking words.

Demo data must look real but be fictional (hospital names, no real person). Nothing from the production database of real users.
