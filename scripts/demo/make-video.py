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
OVERRIDES_FILE = ROOT / "scripts" / "demo" / "sync-overrides.json"
OVERRIDES = json.loads(OVERRIDES_FILE.read_text("utf-8")) if OVERRIDES_FILE.exists() else {}
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


CAPTION_MAX = 7.0
CAPTION_MIN = 2.0
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


def diff_counts(video: Path, start=0.0, dur=None, fps=10, w=144, h=288):
    """Per frame (at `fps`): how many pixels changed by more than 12 grey levels since the previous frame. A typed character is
    dozens of pixels, an identical frame is 0, so this tells typing from waiting (a mean over the picture could not)."""
    import numpy as np
    cmd = [FFMPEG, "-v", "error"]
    if start:
        cmd += ["-ss", f"{start:.2f}"]
    if dur:
        cmd += ["-t", f"{dur:.2f}"]
    cmd += ["-i", str(video.resolve()), "-vf", f"fps={fps},scale={w}:{h},format=gray", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    data = subprocess.run(cmd, capture_output=True).stdout
    n = w * h
    count = len(data) // n
    if count < 2:
        return []
    a = np.frombuffer(data[: count * n], dtype=np.uint8).reshape(count, n).astype(np.int16)
    return [0] + [int(x) for x in (np.abs(a[1:] - a[:-1]) > 12).sum(axis=1)]


STILL_PIXELS = 3     # at most this many changed pixels: the screen is still
BURST_PIXELS = 600   # at least this many: a screen change (navigation, sheet, keyboard)


HOLD_MIN = 0.9    # a still stretch longer than this is shortened
HOLD_KEEP = 0.5   # ...to this much at its start
HOLD_TAIL = 0.15  # plus this much right before the screen changes again
STILL = 0.25      # mean grey-level change per frame below which the screen counts as still


def static_cuts(video: Path, start: float, dur: float):
    """Intervals (seconds from the clip start) of dead time to remove: stretches where the screen does not change at all (waiting for
    the server, a code to arrive, a screen to load). Everything that moves, including typing, is kept."""
    fps = 10
    c = diff_counts(video, start, dur, fps)
    still = [x <= STILL_PIXELS for x in c]
    cuts, i = [], 0
    while i < len(still):
        if not still[i]:
            i += 1
            continue
        j = i
        while j < len(still) and still[j]:
            j += 1
        a_, b_ = i / fps, j / fps
        if b_ - a_ > HOLD_MIN:
            lo, hi = a_ + HOLD_KEEP, b_ - HOLD_TAIL
            if hi - lo > 0.3:
                cuts.append((lo, hi))
        i = j
    return cuts


def remap(t: float, cuts) -> float:
    """Clip time t (before the cuts) -> time after the cuts."""
    out = t
    for a, b in cuts:
        if t >= b:
            out -= b - a
        elif t > a:
            out -= t - a
    return out


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


def render_chapter(work: Work, video: Path, start: float, dur: float, caption_starts, idx: int, titles, out: Path, cuts=()):
    """caption_starts: [(t, text)], t in seconds of the clip AFTER the dead time was cut.
    Stage A cuts the dead time and scales the phone. Stage B pauses on the screen as it was just before each caption's action
    (a still image of that exact last frame is shown for CAPTION_MIN minus the time the action takes), so each caption can be read
    even when the steps are quick. Returns ([(start, end, text)] in the finished clip, its duration)."""
    total = len(titles)
    _, (vw, vh) = video_info(video)
    drop = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in cuts)
    pick = f"select='not({drop})',setpts=N/({FPS}*TB)," if cuts else ""
    kept = dur - sum(b - a for a, b in cuts)
    cutfile = work.dir / f"cut-{out.stem}.mp4"
    run([FFMPEG, "-y", "-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", video.resolve(), "-vf",
         f"{pick}fps={FPS},scale=-2:{PHONE_H}:flags=lanczos,pad=iw+12:ih+12:6:6:color={PANEL},setsar=1,format=yuv420p",
         *encode_args(), cutfile.resolve()])
    real = video_info(cutfile)[0]
    kept = min(kept, real)
    pw, ph = (int(round(PHONE_H * vw / vh / 2) * 2) + 12, PHONE_H + 12) if vw and vh else (456, PHONE_H + 12)
    x_phone = int(PHONE_CX - pw / 2)

    cs = sorted(caption_starts)
    bounds = [0.0] + [min(t, kept) for t, _ in cs] + [kept]
    L = [max(0.0, bounds[k + 1] - bounds[k]) for k in range(len(bounds) - 1)]
    texts = [None] + [t for _, t in cs]
    holds = [max(0.0, CAPTION_MIN - L[k]) if texts[k] else 0.0 for k in range(len(L))]
    inputs = ["-i", cutfile.resolve()]
    f = [f"[0:v]split={len(L)}" + "".join(f"[s{k}]" for k in range(len(L)))]
    order, wins, cur, n_in = [], [], 0.0, 1
    for k in range(len(L)):
        f.append(f"[s{k}]trim=start={bounds[k]:.3f}:end={bounds[k + 1]:.3f},setpts=PTS-STARTPTS,fps={FPS},setsar=1[v{k}]")
        order.append(f"[v{k}]")
        cur_seg_end = cur + L[k]
        if k + 1 < len(L) and holds[k + 1] > 0:
            png = work.dir / f"hold-{out.stem}-{k}.png"
            run([FFMPEG, "-y", "-v", "error", "-ss", f"{max(bounds[k], bounds[k + 1] - 0.3):.3f}", "-i", cutfile.resolve(), "-frames:v", "1", png.resolve()])
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{holds[k + 1]:.3f}", "-i", png.resolve()]
            f.append(f"[{n_in}:v]setpts=PTS-STARTPTS,fps={FPS},setsar=1,format=yuv420p[h{k}]")
            order.append(f"[h{k}]")
            n_in += 1
            cur = cur_seg_end + holds[k + 1]
        else:
            cur = cur_seg_end
        if k + 1 < len(L) and texts[k + 1]:
            w0 = cur_seg_end
            wins.append((w0, min(w0 + holds[k + 1] + L[k + 1], w0 + CAPTION_MAX), texts[k + 1]))
    new_dur = cur
    f.append("".join(order) + f"concat=n={len(order)}:v=1:a=0[ph]")
    f.append(f"[{n_in}:v][ph]overlay=x={x_phone}:y=(H-h)/2[bg]")
    chain = [drawtext(work.text("ApronHanger"), size=44, color=ACCENT, x=64, y=54, bold=True),
             drawtext(work.text("Candidate app walkthrough"), size=24, color=MUTED, x=64, y=108)]
    for i, title in enumerate(titles, 1):
        cur_ch = i == idx
        chain.append(drawtext(work.text(f"{i}. {title}"), size=26, color=WHITE if cur_ch else DIM, x=64, y=190 + (i - 1) * 54, bold=cur_ch))
    chain.append(drawtext(work.text(f"Step {idx} of {total}"), size=30, color=ACCENT, x=CAPTION_X, y=300, bold=True))
    chain.append(drawtext(work.text(wrap(titles[idx - 1], 24)), size=34, color=MUTED, x=CAPTION_X, y=345, bold=True))
    for a_, b_, text in wins:
        chain.append(drawtext(work.text(wrap(text, 21)), size=48, color=WHITE, x=CAPTION_X, y=470, bold=True, enable=f"between(t,{a_:.2f},{b_:.2f})"))
    chain.append(drawtext(work.text(wrap(MANIFEST["disclaimer"], 44)), size=20, color=DIM, x=64, y=H - 92))
    chain.append(f"fade=t=in:st=0:d=0.3,fade=t=out:st={new_dur - 0.3:.2f}:d=0.3")
    f.append("[bg]" + ",".join(chain) + "[v]")
    cmd = [FFMPEG, "-y", *inputs, "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:r={FPS}:d={new_dur + 1:.2f}",
           "-filter_complex", ";".join(f), "-map", "[v]", "-t", f"{new_dur:.2f}", *encode_args(), out.resolve()]
    run(cmd, cwd=work.dir)
    return wins, new_dur


def check_sheet(work: Work, clip: Path, caps, path: Path):
    """One image per chapter: the finished video's frame 1 s after each caption appears, to review that the caption matches the screen."""
    from PIL import Image
    path.parent.mkdir(parents=True, exist_ok=True)
    tiles = []
    for i, (a, b, text) in enumerate(caps):
        t = a + 1.0
        png = work.dir / f"chk-{path.stem}-{i}.png"
        run([FFMPEG, "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", clip.resolve(), "-vf", "crop=1100:1080:560:0,scale=420:-1", "-frames:v", "1", png.resolve()])
        if png.exists():
            tiles.append(Image.open(png).convert("RGB"))
    if not tiles:
        return
    w, h = tiles[0].size
    cols = min(len(tiles), 4)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, h * rows), "white")
    for i, im in enumerate(tiles):
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet.save(path)


def concat(parts, out: Path, tmp: Path):
    lst = tmp / "concat.txt"
    lst.write_text("".join(f"file '{esc_path(p.resolve())}'\n" for p in parts), encoding="utf-8")
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", lst.resolve(), "-c", "copy", "-movflags", "+faststart", out.resolve()])


def screen_events(video: Path, fps=10):
    """Times (s) where a real screen change starts (navigation, sheet, keyboard): a burst of changed pixels after a calmer moment."""
    c = diff_counts(video, fps=fps)
    ev, i = [], 0
    while i < len(c):
        if c[i] >= BURST_PIXELS:
            j = i
            while j < len(c) and c[j] > STILL_PIXELS:
                j += 1
            ev.append(i / fps)
            i = max(j, i + 1)
        else:
            i += 1
    return ev


ACTION_KEYS = ("tapOnElement", "inputTextCommand", "backPressCommand", "swipeCommand", "scrollUntilVisible")


def app_launch_time(video: Path, fps=10):
    """Video time (s) at which the app first appears: the end of the long still stretch at the start (the simulator sits on the home
    screen while Maestro starts up). 0.0 if there is no such stretch."""
    c = diff_counts(video, fps=fps)
    i = int(4 * fps)  # skip the appearance flips at the very start
    while i < len(c):
        if c[i] <= STILL_PIXELS:
            j = i
            while j < len(c) and c[j] <= STILL_PIXELS:
                j += 1
            if (j - i) / fps >= 6.0:
                return j / fps
            i = j
        else:
            i += 1
    return 0.0


def refine_shift(video: Path, log, at, warn, flow: str):
    """The appearance flips used for the first sync can show up on screen many seconds late (a different amount every time), so
    the recorder and Maestro clocks cannot be tied together by them. Instead find the shift (seconds) that lines the taps in the log
    up with the moments the screen really changes, scoring a tap higher the sooner a change follows it, and only accepting shifts that
    put the first tap AFTER the app has launched. Returns the shift to ADD to at()."""
    ev = screen_events(video)
    launch = app_launch_time(video)
    taps = [at(ts) for ts, _, txt in log if any(k in txt for k in ACTION_KEYS) and "runFlowCommand" not in txt[:80]]
    if not taps or not ev:
        warn(f"{flow}: no taps or screen changes to line up, keeping the start sync")
        return 0.0
    first = min(taps)
    best, best_s, best_n = -1.0, None, 0
    for k in range(-600, 151):  # -60 s .. +15 s in 0.1 s steps
        sh = k / 10.0
        if first + sh < launch - 0.5:
            continue  # the app was not running yet
        score, hit = 0.0, 0
        for t in taps:
            nxt = next((e for e in ev if e >= t + sh - 0.2), None)
            if nxt is not None and nxt - (t + sh) <= 3.0:
                score += 1.0 - max(0.0, nxt - (t + sh)) / 3.0
                hit += 1
        if score > best + 1e-9:
            best, best_s, best_n = score, sh, hit
    if best_s is None or best_n < max(3, len(taps) * 0.5):
        warn(f"{flow}: only {best_n} of {len(taps)} taps line up with screen changes: using the app launch as the anchor")
        # fall back: the first tap is a little after the app appears
        return (launch + 1.5) - first if launch else 0.0
    print(f"  {flow}: shift {best_s:+.1f}s ({best_n}/{len(taps)} taps line up, app launch at {launch:.1f}s)")
    return best_s


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

    base = lambda ts_ms: v_dark + (ts_ms - t_dark) / 1000.0
    shift = refine_shift(video, log, base, lambda m: warn(m), flow)

    shift += OVERRIDES.get(flow, 0.0)  # a hand-checked correction for a chapter, see sync-overrides.json

    def at(ts_ms):
        return base(ts_ms) + shift

    first_ts = log[0][0]
    last_end = max(ts + dur for ts, dur, _ in log)
    start_marker = next((ts for ts, _, txt in log if f"start-{flow}.yaml" in txt), None)
    start = at(start_marker if start_marker else first_ts) - 0.4
    end = min(vdur - 0.05, at(last_end) + 1.2)
    # Each caption belongs to the first tap after its marker. The shift for the whole chapter is only good to about a second or two,
    # so snap each caption to the screen change that really follows its own tap (within a short window), keeping the lead.
    ev = screen_events(video)
    tap_ts = [ts for ts, _, txt in log if any(k in txt for k in ACTION_KEYS) and "runFlowCommand" not in txt[:80]]
    caps = []
    for n in range(1, 30):
        ts = next((ts for ts, _, txt in log if f"cap-{flow}-{n}.yaml" in txt), None)
        if ts is None:
            break
        t = at(ts)
        tp = next((at(x) for x in tap_ts if x >= ts), None)
        if tp is not None:
            e = next((e for e in ev if tp - 0.3 <= e <= tp + 2.5), None)
            if e is not None and abs(e - tp) > 0.15:
                t += (e - 0.25) - tp
        caps.append((t, n))
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
        cuts = static_cuts(video, start, dur) if not args.keep_waits else []
        kept = dur - sum(b - a for a, b in cuts)
        # Where each caption starts in the clip after the dead time is cut. Two captions closer than 0.4 s apart cannot both be
        # shown: keep the first.
        starts = []
        for t, n in caps:
            t2 = remap(max(0.0, t - start), cuts)
            if starts and t2 - starts[-1][0] < 0.4:
                print(f"  {flow}: caption {n} left out (only {t2 - starts[-1][0]:.1f}s after the previous)")
                continue
            starts.append((t2, cap_text[flow][n - 1]))
        card = out / "chapters" / f"{idx:02d}-{flow}-card.mp4"
        clip = out / "chapters" / f"{idx:02d}-{flow}-clip.mp4"
        render_card(work, card, [
            (f"Step {idx} of {len(chapters)}", 36, ACCENT, True, 380),
            (wrap(ch["title"], 34), 76, WHITE, True, 450),
            (ch["subtitle"], 36, MUTED, False, 640),
        ], 2.4)
        rel, new_dur = render_chapter(work, video, start, dur, starts, idx, titles, clip, cuts)
        check_sheet(work, clip, rel, out / "checks" / f"{idx:02d}-{flow}.png")
        single = out / "chapters" / f"{idx:02d}-{flow}.mp4"
        concat([card, clip], single, out / "_work")
        segments.append((card, clip))
        print(f"chapter {idx:02d} {flow}: {dur:.1f}s -> {new_dur:.1f}s ({len(cuts)} waits shortened), {len(rel)} captions")
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
    ap.add_argument("--keep-waits", action="store_true", help="do not shorten still stretches")
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
