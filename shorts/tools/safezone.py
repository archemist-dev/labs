"""Safe-zone check for a rendered Short (1080x1920).

Grabs a frame every STEP seconds, measures bright "ink" (text, lines, numbers) inside the zones the
YouTube Shorts and Instagram Reels interfaces cover or crowd, and writes a contact sheet with the zones
drawn on every frame, so a label under a button is seen before publishing, not after.

    .venv/Scripts/python -I tools/safezone.py out/07-short1-en.mp4            # report + out/07-short1-en-safe.png
    .venv/Scripts/python -I tools/safezone.py out/07-short1-en.mp4 --step 1   # denser sampling
    .venv/Scripts/python -I tools/safezone.py out/07-short1-thumb.png         # a cover or a still

Exit code 1 when any frame has ink in a hard zone. The zones mirror SAFE in src/theme.ts: change both.
"""
import argparse
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

W, H = 1080, 1920

# name: (x0, y0, x1, y1, hard). Hard = covered by app UI or cut by the screen; soft = crowded, keep text out.
ZONES = {
    "top bar": (0, 0, W, 200, True),
    "left edge": (0, 200, 76, 1500, True),
    "right edge": (1004, 200, W, 900, True),
    "action column": (890, 900, W, 1500, True),
    "bottom UI": (0, 1500, W, H, True),
    "caption band": (80, 1300, 890, 1500, False),  # captions only; scene content stays above 1300
}
INK_LUMA = 150      # brighter than this counts as ink (text is #f2efe9, background #1b1d21)
INK_MIN_PCT = 0.15  # of a zone's pixels, to ignore glow and antialiasing


def frames_from(path, step):
    if path.lower().endswith((".png", ".jpg", ".jpeg")):
        return [(0.0, Image.open(path).convert("RGB"))]
    tmp = tempfile.mkdtemp(prefix="safezone-")
    pattern = os.path.join(tmp, "f-%04d.png")
    # Remotion's bundled ffmpeg has no fps filter and cmd.exe mangles select=...: an output rate does the same job.
    cmd = f'npx remotion ffmpeg -loglevel error -i "{path}" -r {1 / step:.4f} "{pattern}"'
    subprocess.run(cmd, shell=True, check=True)
    names = sorted(n for n in os.listdir(tmp) if n.endswith(".png"))
    return [(i * step, Image.open(os.path.join(tmp, n)).convert("RGB")) for i, n in enumerate(names)]


def ink_pct(img, box):
    crop = img.crop(box).convert("L")
    hist = crop.histogram()
    return 100.0 * sum(hist[INK_LUMA:]) / (crop.width * crop.height)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--step", type=float, default=2.0, help="seconds between sampled frames")
    ap.add_argument("--captions", action="store_true", help="also report ink in the caption band (expected when captions are on)")
    a = ap.parse_args()

    frames = frames_from(a.path, a.step)
    if not frames:
        sys.exit("no frames read")
    bad = 0
    thumbs = []
    for t, img in frames:
        if img.size != (W, H):
            img = img.resize((W, H))
        hits = []
        for name, (x0, y0, x1, y1, hard) in ZONES.items():
            if not hard and not a.captions:
                continue
            pct = ink_pct(img, (x0, y0, x1, y1))
            if pct >= INK_MIN_PCT:
                hits.append((name, pct, hard))
        if any(h[2] for h in hits):
            bad += 1
        if hits:
            print(f"{t:6.1f} s  " + ", ".join(f"{n} {p:.1f}%" for n, p, _ in hits))
        over = img.convert("RGBA")
        layer = Image.new("RGBA", over.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for name, (x0, y0, x1, y1, hard) in ZONES.items():
            hit = any(h[0] == name for h in hits)
            fill = (229, 72, 77, 110) if hit and hard else (229, 72, 77, 45) if hard else (212, 160, 23, 40)
            d.rectangle((x0, y0, x1 - 1, y1 - 1), fill=fill, outline=(229, 72, 77, 200) if hard else (212, 160, 23, 200), width=3)
        over = Image.alpha_composite(over, layer).convert("RGB").resize((270, 480))
        ImageDraw.Draw(over).text((6, 4), f"{t:.0f}s", fill=(255, 255, 255))
        thumbs.append(over)

    cols = min(8, len(thumbs))
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 270, rows * 480), (0, 0, 0))
    for i, th in enumerate(thumbs):
        sheet.paste(th, ((i % cols) * 270, (i // cols) * 480))
    out = os.path.splitext(a.path)[0] + "-safe.png"
    sheet.save(out)
    print(f"{len(frames)} frames, {bad} with ink in a hard zone; sheet: {out}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
