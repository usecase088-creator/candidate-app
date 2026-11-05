#!/usr/bin/env python3
"""Builds e2e/demo/ (flows for the client walkthrough video) from the proven test flows in e2e/maestro/.

The test flows are kept as they are (they pass on Android and iPhone). Each demo copy only gets:
  - short pauses after taps, typing and checks, so a viewer can follow what happens;
  - marker steps that the video editor reads from Maestro's command log: one per caption, plus a "start" marker that
    says where the clip begins (to skip the sign-in set-up that many flows start with).
Markers are tiny sub-flows named cap-<flow>-<n>.yaml / start-<flow>.yaml: the file name appears in the command log with a
timestamp, which is how captions are lined up with the recording (scripts/demo/make-video.py).

Run:  python scripts/demo/build-demo-flows.py     (then commit e2e/demo)
"""
import json
import re
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "e2e" / "maestro"
DST = ROOT / "e2e" / "demo"
STORY = json.loads((ROOT / "scripts" / "demo" / "story.json").read_text("utf-8"))

# Pause (ms) after a top-level command of this kind.
PAUSE_AFTER = {"tapOn": 900, "inputText": 600, "assertVisible": 1200, "extendedWaitUntil": 500, "scrollUntilVisible": 400}
FIRST_PAUSE_MS = 1500  # after the app has launched
LAST_PAUSE_MS = 2500  # so the end result stays on screen
APP_ID = "work.apronhanger.candidate.dev"


def kind(cmd) -> str:
    if isinstance(cmd, dict) and cmd:
        return next(iter(cmd))
    return str(cmd)


def text_of(cmd) -> str:
    return yaml.safe_dump(cmd, sort_keys=False, allow_unicode=True, width=10_000)


def write_flow(path: Path, commands: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = yaml.safe_dump_all([{"appId": APP_ID}, commands], sort_keys=False, allow_unicode=True, width=10_000)
    path.write_text(body, encoding="utf-8", newline="\n")


def pause_ref(ms: int) -> dict:
    f = DST / "_demo" / f"pause-{ms}.yaml"
    if not f.exists():
        script = "${ (function () { var t = Date.now(); while (Date.now() - t < %d) {} })() }" % ms
        write_flow(f, [{"evalScript": script}])
    return {"runFlow": f"_demo/pause-{ms}.yaml"}


def marker_ref(name: str, label: str) -> dict:
    f = DST / "_demo" / f"{name}.yaml"
    write_flow(f, [{"evalScript": "${ output.demoMarker = %s }" % json.dumps(label)}])
    return {"runFlow": f"_demo/{name}.yaml"}


def build_chapter(ch: dict, warnings: list) -> None:
    flow = ch["flow"]
    docs = list(yaml.safe_load_all((SRC / f"{flow}.yaml").read_text("utf-8")))
    commands = docs[1]
    caps = [dict(c, n=i + 1, seen=0, placed=False) for i, c in enumerate(ch["captions"])]
    start_re = re.compile(ch["start"]) if ch.get("start") else None
    start_placed = start_re is None
    out: list = []
    for i, cmd in enumerate(commands):
        t = text_of(cmd)
        if not start_placed and start_re.search(t):
            out.append(marker_ref(f"start-{flow}", "START"))
            start_placed = True
        for c in caps:
            if c["placed"] or not re.search(c["at"], t):
                continue
            c["seen"] += 1
            if c["seen"] == c.get("nth", 1):
                out.append(marker_ref(f"cap-{flow}-{c['n']}", c["text"]))
                c["placed"] = True
        out.append(cmd)
        k = kind(cmd)
        if k == "launchApp":
            out.append(pause_ref(FIRST_PAUSE_MS))
        elif k in PAUSE_AFTER:
            out.append(pause_ref(PAUSE_AFTER[k]))
    out.append(pause_ref(LAST_PAUSE_MS))
    if not start_placed:
        warnings.append(f"{flow}: start anchor {ch['start']!r} not found")
    for c in caps:
        if not c["placed"]:
            warnings.append(f"{flow}: caption {c['n']} anchor {c['at']!r} not found")
    write_flow(DST / f"{flow}.yaml", out)


def main() -> int:
    if DST.exists():
        shutil.rmtree(DST)
    DST.mkdir(parents=True)
    shutil.copytree(SRC / "_common", DST / "_common")
    warnings: list = []
    for ch in STORY["chapters"]:
        build_chapter(ch, warnings)
    manifest = {
        "title": STORY["title"],
        "disclaimer": STORY["disclaimer"],
        "chapters": [
            {"flow": c["flow"], "title": c["title"], "subtitle": c["subtitle"], "batch": c.get("batch", 1)}
            for c in STORY["chapters"]
        ],
    }
    (DST / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8", newline="\n")
    for w in warnings:
        print("WARNING:", w)
    print(f"built {len(STORY['chapters'])} demo flows in {DST.relative_to(ROOT)}")
    return 1 if warnings else 0


if __name__ == "__main__":
    sys.exit(main())
