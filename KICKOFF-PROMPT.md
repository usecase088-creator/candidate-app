How to start:
1. Make an empty folder `apronhanger-app` inside a parent folder (e.g. `C:\work\apronhanger-app`).
2. Unzip this kit into it (CLAUDE.md, .claude/, docs/ at the top level).
3. Open a terminal in that folder, run `claude`, and paste the text below.

---

We are building the ApronHanger candidate app (Expo, Android + iOS). Read CLAUDE.md, docs/PLAN.md,
docs/PHASE-1.md, docs/DECISIONS.md and docs/SETUP.md fully before doing anything.

Step 1 — Check my machine against docs/SETUP.md (node, git, gh auth status, java, adb, maestro,
eas). Tell me what is missing with the exact install step for Windows. Don't install anything without asking.

Step 2 — Do Phase 1 Task 0b: find the `job` repo with the GitHub CLI and clone it to ../job on branch
conflict-resolution1 (no hyphen before the 1). It is READ-ONLY: never edit, commit, push or switch branches there.
Show me the repo name and commit hash you cloned.

Step 3 — Do Phase 1 Task 1 (reference inventory: docs/reference/API.md, SCREENS.md, THEME.md).
Read the code; don't guess. Where the facts listed in PHASE-1.md are wrong, correct them and tell me.

Then stop and give me:
1. A short summary: number of endpoints, screens, and the top risks you found.
2. Any question that blocks Task 2.

From then on, work one task at a time: test first, code, `npm run check`, commit, tick the box in
PHASE-1.md, give me a 5-line summary, and wait for my OK before the next task.
