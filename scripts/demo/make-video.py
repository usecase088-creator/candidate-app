#!/usr/bin/env python3
"""Edits the client walkthrough video from the iPhone recordings (workflow ios-demo, artifact ios-demo-*).

For every chapter of e2e/demo/manifest.json:
  1. finds the recording video-<flow>.mp4, the clock sync sync-<flow>.txt and Maestro's command log (maestro-<flow>/**/commands*.json);
  2. lines the log up with the video (the screen flipped to dark mode and back at the known times in sync-<flow>.txt);
  3. cuts the clip from its "start" marker to the end of the last command and times the captions from the cap-<flow>-<n> markers;
  4. renders it on a 16:9 canvas: chapter list on the left, the phone in the middle, the caption on the right.
Then it joins an intro, a title card per chapter, the chapters and an outro into one video, and also writes one video per chapter.

Usage:
  python scripts/demo/make-video.py --art <artifact folder> [--art <another>] --out <output folder> [--only flow,flow]
  python scripts/demo/make-video.py --preview <video.mp4> --start 5 --dur 12 --caption "Some caption" --out <folder>   (layout check)
Needs: pip install --user imageio-ffmpeg Pillow   (ffmpeg comes with imageio-ffmpeg)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1920, 1080, 30
BG, PANEL, ACCENT, WHITE, MUTED, DIM = "0x0B1220", "0x1E293B", "0x3B82F6", "0xFFFFFF", "0x94A3B8", "0x64748B"
PHONE_H = 960
PHONE_CX = 1000
CAPTION_X = 1330
FONT_BOLD, FONT_REG = Path("C:/Windows/Fonts/arialbd.ttf"), Path("C:/Windows/Fonts/arial.ttf")
MANIFEST = json.loads((ROOT / "e2e" / "demo" / "manifest.json").read_text("utf-8"))


def run(cmd, cwd=None, quiet=True):
    p = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        sys.stderr.write(p.stderr[-3000:] + "\n")
        raise SystemExit(f"ffmpeg failed: {' '.join(str(c) for c in cmd)[:300]}")
    return p


def video_info(path: Path):
    p = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    size = re.search(r", (\d{3,5})x(\d{3,5})", p.stderr)
    seconds = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3)) if dur else 0.0
    return seconds, (int(size.group(1)), int(size.group(2))) if size else (0, 0)


def to_cfr(video: Path, work_dir: Path) -> Path:
    """The simulator only writes a frame when the screen changes (about 6 fps on average). Cutting such a file loses the quiet
    parts, so convert it once to a steady 30 fps first."""
    out = work_dir / f"cfr-{video.stem}.mp4"
    if not out.exists():
        run([FFMPEG, "-y", "-i", video.resolve(), "-fps_mode", "cfr", "-r", str(FPS), "-an", "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "16", "-pix_fmt", "yuv420p", out.resolve()])
    return out


def gray_means(path: Path, fps=10, w=24, h=48, max_seconds=None):
    """Mean brightness per frame (at `fps`), for finding the dark/light flips."""
    cmd = [FFMPEG, "-v", "error"]
    if max_seconds:
        cmd += ["-t", str(max_seconds)]
    cmd += ["-i", str(path), "-vf", f"fps={fps},scale={w}:{h},format=gray", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    data = subprocess.run(cmd, capture_output=True).stdout
    n = w * h
    return [sum(data[i : i + n]) / n for i in range(0, len(data) - n + 1, n)]


CAPTION_MAX = 9.0
LIGHT_LAG = 0.25  # the light-mode command returns about this long after the screen has changed


def find_sync(video: Path, t_dark_ms: int, t_light_ms: int, warn):
    """Video time (s) that matches the wall-clock t_dark_ms.

    The recording flips the screen to dark mode and back to light at known wall-clock times (sync-<flow>.txt holds the times
    when each command RETURNED). The dark command takes 0.5 to 0.9 s longer to return than the light one, so the gap between
    the two flips in the video is not the gap between the timestamps. The light flip is the cleaner one: use it, assume it was
    visible LIGHT_LAG s before its command returned, and ignore the dark flip except as a sanity check."""
    means = gray_means(video, max_seconds=25)
    lo, hi = (min(means), max(means)) if means else (0, 0)
    dark = [i for i, m in enumerate(means) if m < (lo + hi) / 2] if hi - lo > 30 else []
    if not dark:
        warn("could not find the dark phase: using a fixed lead-in")
        return 3.3
    # The dark phase is the longest run of dark frames.
    runs, cur = [], [dark[0]]
    for i in dark[1:]:
        if i == cur[-1] + 1:
            cur.append(i)
        else:
            runs.append(cur)
            cur = [i]
    runs.append(cur)
    run = max(runs, key=len)
    v_light = (run[-1] + 1) / 10.0
    return v_light + LIGHT_LAG - (t_light_ms - t_dark_ms) / 1000.0


def load_log(folder: Path):
    files = sorted(folder.rglob("commands*.json"), key=lambda p: p.stat().st_size, reverse=True)
    if not files:
        return []
    entries = []
    for e in json.loads(files[0].read_text("utf-8")):
        md = e.get("metadata", {})
        if "timestamp" in md:
            entries.append((int(md["timestamp"]), int(md.get("duration", 0)), json.dumps(e)))
    return sorted(entries)


def esc_path(p: Path) -> str:
    return str(p).replace("\\", "/")


def wrap(text: str, width: int) -> str:
    return "\n".join(textwrap.wrap(text, width=width, break_long_words=False))


def drawtext(textfile: str, *, size, color, x, y, bold=False, enable=None, align=None):
    font = "fonts/arialbd.ttf" if bold else "fonts/arial.ttf"
    parts = [f"fontfile={font}", f"textfile={textfile}", f"fontsize={size}", f"fontcolor={color}", f"x={x}", f"y={y}", "line_spacing=10"]
    if enable:
        parts.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(parts)


class Work:
    """A temp folder with the fonts and the text files that drawtext reads (relative paths avoid Windows ':' escaping)."""

    def __init__(self, folder: Path):
        self.dir = folder
        self.dir.mkdir(parents=True, exist_ok=True)
        (self.dir / "fonts").mkdir(exist_ok=True)
        shutil.copy(FONT_BOLD, self.dir / "fonts" / "arialbd.ttf")
        shutil.copy(FONT_REG, self.dir / "fonts" / "arial.ttf")
        self.n = 0

    def text(self, s: str) -> str:
        self.n += 1
        name = f"t{self.n}.txt"
        with open(self.dir / name, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(s)
        return name


def encode_args():
    return ["-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart"]


def render_card(work: Work, out: Path, lines, seconds):
    """lines: [(text, size, color, bold, y)] centred."""
    filters = []
    for text, size, color, bold, y in lines:
        tf = work.text(text)
        filters.append(drawtext(tf, size=size, color=color, x="(w-text_w)/2", y=y, bold=bold))
    filters.append(f"fade=t=in:st=0:d=0.4,fade=t=out:st={seconds - 0.4}:d=0.4")
    cmd = [FFMPEG, "-y", "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:r={FPS}:d={seconds}", "-vf", ",".join(filters), *encode_args(), out.resolve()]
    run(cmd, cwd=work.dir)


def render_chapter(work: Work, video: Path, start: float, dur: float, captions, idx: int, titles, out: Path):
    """captions: [(t_start, t_end, text)] relative to the clip start."""
    total = len(titles)
    _, (vw, vh) = video_info(video)
    pw = int(round(PHONE_H * vw / vh / 2) * 2) if vw and vh else 444
    x_phone = int(PHONE_CX - (pw + 12) / 2)
    f = [
        f"[0:v]fps={FPS},scale=-2:{PHONE_H}:flags=lanczos,pad=iw+12:ih+12:6:6:color={PANEL}[ph]",
        f"[1:v][ph]overlay=x={x_phone}:y=(H-h)/2[bg]",
    ]
    chain = []
    chain.append(drawtext(work.text("ApronHanger"), size=44, color=ACCENT, x=64, y=54, bold=True))
    chain.append(drawtext(work.text("Candidate app walkthrough"), size=24, color=MUTED, x=64, y=108))
    for i, title in enumerate(titles, 1):
        cur = i == idx
        chain.append(drawtext(work.text(f"{i}. {title}"), size=26, color=WHITE if cur else DIM, x=64, y=190 + (i - 1) * 54, bold=cur))
    chain.append(drawtext(work.text(f"Step {idx} of {total}"), size=30, color=ACCENT, x=CAPTION_X, y=300, bold=True))
    chain.append(drawtext(work.text(wrap(titles[idx - 1], 24)), size=34, color=MUTED, x=CAPTION_X, y=345, bold=True))
    for a, b, text in captions:
        chain.append(
            drawtext(work.text(wrap(text, 21)), size=48, color=WHITE, x=CAPTION_X, y=470, bold=True, enable=f"between(t,{a:.2f},{b:.2f})")
        )
    chain.append(drawtext(work.text(wrap(MANIFEST["disclaimer"], 44)), size=20, color=DIM, x=64, y=H - 92))
    chain.append(f"fade=t=in:st=0:d=0.3,fade=t=out:st={dur - 0.3:.2f}:d=0.3")
    f.append("[bg]" + ",".join(chain) + "[v]")
    cmd = [
        FFMPEG, "-y", "-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", video.resolve(),
        "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:r={FPS}:d={dur:.2f}",
        "-filter_complex", ";".join(f), "-map", "[v]", *encode_args(), out.resolve(),
    ]
    run(cmd, cwd=work.dir)


def concat(parts, out: Path, tmp: Path):
    lst = tmp / "concat.txt"
    lst.write_text("".join(f"file '{esc_path(p.resolve())}'\n" for p in parts), encoding="utf-8")
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", lst.resolve(), "-c", "copy", "-movflags", "+faststart", out.resolve()])


def chapter_timeline(flow: str, art: Path, warn, work_dir: Path):
    """Returns (video, start, end, [(t_start, text)]) in video seconds, or None when the recording is missing."""
    video = art / f"video-{flow}.mp4"
    if not video.exists():
        return None
    video = to_cfr(video, work_dir)
    vdur, _ = video_info(video)
    sync = art / f"sync-{flow}.txt"
    log = load_log(art / f"maestro-{flow}")
    if not (sync.exists() and log):
        warn(f"{flow}: no sync or command log, cutting by eye is needed")
        return None
    t_dark, t_light = (int(x) for x in sync.read_text().split()[:2])
    v_dark = find_sync(video, t_dark, t_light, lambda m: warn(f"{flow}: {m}"))

    def at(ts_ms):
        return v_dark + (ts_ms - t_dark) / 1000.0

    first_ts = log[0][0]
    last_end = max(ts + dur for ts, dur, _ in log)
    start_marker = next((ts for ts, _, txt in log if f"start-{flow}.yaml" in txt), None)
    start = at(start_marker if start_marker else first_ts) - 0.4
    end = min(vdur - 0.05, at(last_end) + 1.2)
    caps = []
    for n in range(1, 30):
        ts = next((ts for ts, _, txt in log if f"cap-{flow}-{n}.yaml" in txt), None)
        if ts is None:
            break
        caps.append((at(ts), n))
    return video, max(0.0, start), end, caps


def build(args):
    out = Path(args.out)
    work = Work(out / "_work")
    (out / "chapters").mkdir(parents=True, exist_ok=True)
    warnings = []
    warn = lambda m: (warnings.append(m), print("WARNING:", m))
    chapters = MANIFEST["chapters"]
    titles = [c["title"] for c in chapters]
    only = set(args.only.split(",")) if args.only else None
    arts = [Path(a) for a in args.art]
    story = json.loads((ROOT / "scripts" / "demo" / "story.json").read_text("utf-8"))
    cap_text = {c["flow"]: [x["text"] for x in c["captions"]] for c in story["chapters"]}
    segments = []
    for idx, ch in enumerate(chapters, 1):
        flow = ch["flow"]
        if only and flow not in only:
            continue
        tl = None
        for art in arts:
            tl = chapter_timeline(flow, art, warn, work.dir)
            if tl:
                break
        if not tl:
            warn(f"{flow}: skipped (no usable recording)")
            continue
        video, start, end, caps = tl
        dur = max(3.0, end - start)
        rel = []
        for i, (t, n) in enumerate(caps):
            a = max(0.0, t - start)
            b = (caps[i + 1][0] - start) if i + 1 < len(caps) else dur
            # A caption that outlives its step is worse than none: show each for at most CAPTION_MAX seconds.
            rel.append((a, min(dur, b, a + CAPTION_MAX), cap_text[flow][n - 1]))
        card = out / "chapters" / f"{idx:02d}-{flow}-card.mp4"
        clip = out / "chapters" / f"{idx:02d}-{flow}-clip.mp4"
        render_card(work, card, [
            (f"Step {idx} of {len(chapters)}", 36, ACCENT, True, 380),
            (wrap(ch["title"], 34), 76, WHITE, True, 450),
            (ch["subtitle"], 36, MUTED, False, 640),
        ], 2.4)
        render_chapter(work, video, start, dur, rel, idx, titles, clip)
        single = out / "chapters" / f"{idx:02d}-{flow}.mp4"
        concat([card, clip], single, out / "_work")
        segments.append((card, clip))
        print(f"chapter {idx:02d} {flow}: {dur:.1f}s, {len(rel)} captions -> {single.name}")
    if not segments:
        raise SystemExit("nothing to build")
    intro, outro = out / "chapters" / "00-intro.mp4", out / "chapters" / "99-outro.mp4"
    render_card(work, intro, [
        ("ApronHanger", 120, ACCENT, True, 300),
        (wrap(MANIFEST["title"].split(":")[1].strip().capitalize(), 40), 52, WHITE, True, 470),
        ("Candidate app  |  iPhone", 34, MUTED, False, 620),
        (MANIFEST["disclaimer"], 26, DIM, False, 930),
    ], 5.5)
    render_card(work, outro, [
        ("That is the whole journey", 70, WHITE, True, 380),
        ("From first launch to deleting an account", 38, MUTED, False, 500),
        (MANIFEST["disclaimer"], 26, DIM, False, 930),
    ], 4.0)
    parts = [intro]
    for card, clip in segments:
        parts += [card, clip]
    parts.append(outro)
    final = out / "ApronHanger-walkthrough.mp4"
    concat(parts, final, out / "_work")
    secs, _ = video_info(final)
    print(f"\nfinal: {final}  ({secs/60:.1f} min, {final.stat().st_size/1e6:.0f} MB)")
    if warnings:
        print(f"{len(warnings)} warning(s), see above")


def preview(args):
    out = Path(args.out)
    work = Work(out / "_work")
    titles = [c["title"] for c in MANIFEST["chapters"]]
    clip = out / "preview-layout.mp4"
    render_chapter(work, to_cfr(Path(args.preview), work.dir), args.start, args.dur, [(1.0, args.dur - 1.0, args.caption)], args.idx, titles, clip)
    print("wrote", clip)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", action="append", default=[], help="artifact folder (repeat for several)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--preview", help="video to lay out for a quick look")
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--dur", type=float, default=12)
    ap.add_argument("--caption", default="A caption that explains this step")
    ap.add_argument("--idx", type=int, default=1)
    a = ap.parse_args()
    if a.preview:
        preview(a)
    else:
        if not a.art:
            raise SystemExit("--art is required")
        build(a)
