# Stage 2: smoothness, measured (2026-11-02)

Build: EAS preview `d91e342f` (release build, talks to staging) on the Realme RMX3944, signed in as the demo applicant, staging awake.
Method: Maestro's own per-command durations (`~/.maestro/tests/<run>/<flow>/commands.json`, flow `timing.yaml`, 4 runs) and Android
`dumpsys gfxinfo` for frames. **Do not time screens with `uiautomator dump` polling:** it waits for the screen to go idle and
reported 2.6 s for a 0.4 s screen (an early wrong reading that nearly led to an unneeded change; reverted).

| What | Result | Target (playbook) |
| --- | --- | --- |
| Cold start to the jobs shown (launch to the "Recommended for you" rail) | 3.1 to 3.6 s (median 3.5 s); `am start -W` TotalTime 1.1 to 1.5 s (splash) | "a few seconds at most": met |
| Tap a job to its details shown | 0.3 to 0.4 s | instant: met |
| Profile tab to the Edit button | 0.4 to 0.6 s | met |
| Tap Edit to the profile builder shown | 0.3 to 0.4 s | met |
| Home feed scroll, 12 swipes | 586 frames, **12 janky (2.05%)**, p50 15 ms, p90 19 ms, p95 20 ms, p99 26 ms, 0 missed Vsync, 0 slow UI thread, 0 slow bitmap uploads | "no visible stutter": met |

**Decision: nothing to fix from these numbers.** The only candidate (show a job from the feed cache before its own request
answers) was built and reverted: it saved about 0.3 s, which the numbers do not justify.

## Backend side (read-only)

- Render production service `job`: region **Singapore**, plan **free** (it sleeps; first request about 50 s; B5 asks the client for an
  always-on plan). Staging service: Singapore, free. Dev Neon database: ap-southeast-1 (Singapore). Production Neon region: not read
  (the production database URL is off limits to this project).
- From this laptop in India, warm: production `/health` 0.74 s; staging `/api/jobs` 0.42 s, `/api/gov-jobs` 0.30 s,
  `/api/jobs/:id` 0.16 s.
- Calls a screen waits on: Home loads the job list, the candidate row, saved jobs and the unread count in parallel (TanStack Query),
  not one after another; a guest loads only the job list.

## Not measured

Re-renders per action (React DevTools highlighting) and the numbers from the production build (the server is asleep unless the
plan changes). A cold start after the server has been idle takes about 50 s on the free plan: that, not the app, is what a store
reviewer would notice.
