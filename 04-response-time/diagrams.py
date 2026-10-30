"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad).

Usage: python3 diagrams.py OUT_DIR
Numbers come from summary-run1.json and summary-run2.json (the reference run, 2026-10-30).
Needs Google Chrome; fonts load from Google Fonts.
"""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1600, 900
BG, FG, MUTED, GRAY, LIGHT = "#1b1d21", "#f2efe9", "#8a8f98", "#5c6370", "#9aa1ab"
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#d4a017"
SANS, MONO = "Inter", "JetBrains Mono"
GRID = "#2c3036"
STEPS = ("20", "40", "60", "70", "80", "90")
FANOUT = ("1", "5", "10", "50")


def text(x, y, s, size, color=FG, font=SANS, weight=700, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}">{s}</text>')


def rect(x, y, w, h, fill="none", stroke="none", rx=14, dash=None, sw=4):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def line(x1, y1, x2, y2, color, sw=4, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"{d}/>'


def polyline(pts, color, sw=7, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<polyline points="{" ".join(f"{x:.0f},{y:.0f}" for x, y in pts)}" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{d}/>')


def frame(title, subtitle, body):
    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, W, H, BG, rx=0)}{text(80, 120, title, 72, weight=800)}'
            f'{rect(80, 146, 120, 8, AMBER, rx=4)}{text(80, 210, subtitle, 30, MUTED, MONO, 400)}{body}</svg>')


def load_runs():
    here = Path(__file__).parent
    return [json.loads((here / f"summary-run{r}.json").read_text()) for r in (1, 2)]


def segments(a, mode):
    """One request's p50 stages in order, to scale: setup, request out, work, response back."""
    s = a[mode]
    flight = (s["wait"]["50"] - s["app"]["50"]) / 2
    return [("dns", s["dns"]["50"], GRAY, ""), ("tcp", s["tcp"]["50"], RED, "TCP"),
            ("tls", s["tls"]["50"], RED, "TLS"), ("out", flight, GRAY, "→"),
            ("work", s["app"]["50"], FG, ""), ("back", flight + s["transfer"]["50"], GRAY, "←")]


def timeline(runs):
    """The same request to scale: service time (the server log's slice) inside latency, both inside response time."""
    a = runs[0]["anatomy"]
    x0, scale = 200, 1080 / a["new"]["total"]["50"]
    b = [text(x0 + v * scale, 870, f"{v}", 28, MUTED, MONO, 700, "middle") for v in range(0, 50, 10)]
    b += [line(x0 + v * scale, 300, x0 + v * scale, 830, GRID, 2) for v in range(0, 50, 10)]
    b.append(text(x0 + 45 * scale, 870, "ms", 28, MUTED, MONO, 700))
    for y, mode, name in ((360, "new", "new connection"), (610, "reused", "reused connection")):
        b.append(text(x0, y - 30, name, 36, LIGHT))
        x, work_x, setup_end = x0, 0, x0
        for key, v, color, label in segments(a, mode):
            w = v * scale
            if w > 0.5:
                b.append(rect(x + 2, y, max(w - 4, 2), 100, color, rx=8))
            if label and w > 60:
                b.append(text(x + w / 2, y + 64, label, 36, BG if color == FG else FG, MONO, 800, "middle"))
            if key == "work":
                work_x = x
            if key == "tls":
                setup_end = x + w
            x += w
        total = a[mode]["total"]["50"]
        b.append(text(x + 24, y + 6, "response time", 28, MUTED, MONO, 700))
        b.append(text(x + 24, y + 76, f"{total:.0f} ms" if total > 20 else f"{total:.1f} ms", 52,
                      RED if mode == "new" else GREEN, MONO, 800))
        work_w = a[mode]["app"]["50"] * scale
        b += [line(work_x + work_w / 2, y + 100, work_x + work_w / 2, y + 140, FG, 3),
              text(work_x + work_w / 2, y + 176, f"service time {a[mode]['app']['50']:.1f}", 30, FG, MONO, 800, "middle")]
        if mode == "new":
            b += [f'<path d="M{x0 + 4},{y - 8} V{y - 18} H{setup_end - 4} V{y - 8}" fill="none" stroke="{RED}" stroke-width="3"/>',
                  text(setup_end, y - 30, f"+{(a['new']['tcp']['50'] + a['new']['tls']['50']):.0f} ms setup", 34, RED, MONO, 800, "end")]
    lx, ly = 880, 262  # legend: what each color means
    b += [rect(lx, ly, 30, 30, RED, rx=6), rect(lx + 38, ly, 30, 30, GRAY, rx=6),
          text(lx + 84, ly + 26, "latency", 30, LIGHT, MONO, 800),
          rect(lx + 260, ly, 30, 30, FG, rx=6), text(lx + 306, ly + 26, "service time", 30, LIGHT, MONO, 800)]
    return frame("The server log sees 4.8 ms", "same request · server Frankfurt · client London · p50", "".join(b))


def knee(runs):
    """Latency against load, log scale: the work stays flat, p50 creeps, p99 of two identical runs disagrees."""
    x0, y0, w, h = 300, 270, 1020, 500
    lo, hi = 3, 1500

    def px(share):
        return x0 + (int(share) - 20) / 70 * w

    def py(ms):
        return y0 + h - (math.log10(ms) - math.log10(lo)) / (math.log10(hi) - math.log10(lo)) * h

    b = []
    for ms in (5, 10, 50, 100, 500, 1000):
        b += [line(x0, py(ms), x0 + w, py(ms), GRID, 2), text(x0 - 20, py(ms) + 10, f"{ms:,}", 30, MUTED, MONO, 700, "end")]
    for s in STEPS:
        b.append(text(px(s), y0 + h + 46, f"{s}%", 30, MUTED, MONO, 700, "middle"))
    b += [text(x0 + w / 2, y0 + h + 96, "load (share of max throughput)", 30, MUTED, MONO, 700, "middle")]
    work = [(px(s), py(runs[0]["load"]["steps"][s]["app_p50"])) for s in STEPS]
    b.append(polyline(work, GRAY, 5, "4 12"))
    b.append(text(px("90") + 24, work[-1][1] + 12, "work", 34, LIGHT, MONO, 800))
    p50 = [(px(s), py(sum(r["load"]["steps"][s]["p50"] for r in runs) / 2)) for s in STEPS]
    b.append(polyline(p50, LIGHT, 7))
    b.append(text(px("90") + 24, p50[-1][1] + 12, "p50", 34, LIGHT, MONO, 800))
    b.append(text(px("20"), p50[0][1] + 50, f"{(sum(r['load']['steps']['20']['p50'] for r in runs) / 2):.0f}", 34, LIGHT, MONO, 800, "middle"))
    for i, (run, dash) in enumerate(zip(runs, (None, "16 12"))):
        pts = [(px(s), py(run["load"]["steps"][s]["p99"])) for s in STEPS]
        b.append(polyline(pts, RED, 7, dash))
        b.append(text(px("90") + 24, pts[-1][1] + 12 + (14 if i else -14), f"p99 run {i + 1}", 34, RED, MONO, 800))
    for s in ("70", "80"):
        v1, v2 = (r["load"]["steps"][s]["p99"] for r in runs)
        top, bottom = max(v1, v2), min(v1, v2)
        b += [text(px(s), py(top) - 22, f"{top:.0f}", 34, FG, MONO, 800, "middle"),
              text(px(s), py(bottom) + 50, f"{bottom:.0f}", 34, FG, MONO, 800, "middle")]
    return frame("Same work. Two runs. Two tails.", "latency in ms · open-loop load · fixed 4.8 ms work · log scale", "".join(b))


def waffle(runs):
    """100 pages per grid: how many hit at least one call slower than the single-call p99."""
    b, cell, gap = [], 24, 4
    for i, n in enumerate(FANOUT):
        gx, gy = 120 + i * 360, 330
        slow = round(100 * runs[0]["load"]["steps"]["40"]["fanout"][n]["p_slow"])
        b.append(text(gx, gy - 30, f"{n} call" + ("s" if n != "1" else ""), 40, FG))
        for k in range(100):
            r, c = divmod(k, 10)
            hit = k >= 100 - slow
            b.append(rect(gx + c * (cell + gap), gy + r * (cell + gap), cell, cell, RED if hit else GRID, rx=4))
        b.append(text(gx, gy + 10 * (cell + gap) + 80, f"{slow}%", 72, RED, MONO, 800))
        at90 = sorted(r["load"]["steps"]["90"]["fanout"][n]["p50"] for r in runs)
        b.append(text(gx, gy + 10 * (cell + gap) + 150, f"{at90[0]:.0f}–{at90[1]:.0f} ms", 36, LIGHT, MONO, 800))
    b.append(text(120, 860, "pages with a p99-slow call · typical page wait at 90% load", 28, MUTED, MONO, 700))
    return frame("1% slow calls, 39% slow pages", "a page waits for its slowest call", "".join(b))


LOGO = """<g transform="translate(0 -13)"><defs><clipPath id="liquid"><rect x="0" y="232" width="512" height="280"/></clipPath></defs>
<circle cx="256" cy="320" r="108" fill="#d4a017" clip-path="url(#liquid)"/>
<path d="M210 104 V194 A134 134 0 1 0 302 194 V104" fill="none" stroke="#f2efe9" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="184" y="72" width="144" height="36" rx="14" fill="#f2efe9"/>
<circle cx="264" cy="208" r="11" fill="#d4a017"/><circle cx="242" cy="174" r="8" fill="#d4a017"/><circle cx="266" cy="142" r="6" fill="#d4a017"/>
<path d="M209 293 V320 H236 M276 320 H303 V347" fill="none" stroke="#1b1d21" stroke-width="14" stroke-linejoin="round"/>
<circle cx="209" cy="274" r="19" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
<rect x="236" y="300" width="40" height="40" rx="6" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
<circle cx="303" cy="366" r="19" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
</g>"""


def cover(runs):
    """1920x1080 newsletter cover: the hook's two numbers, both requests to scale, small logo, footer."""
    cw, ch = 1920, 1080
    a = runs[0]["anatomy"]
    reused, new = (sum(r["anatomy"][m]["total"]["50"] for r in runs) / 2 for m in ("reused", "new"))
    brand = text(222, 990, "ARCHEMIST", 32, AMBER, MONO, 800).replace("<text ", '<text letter-spacing="7" ')
    title = (text(120, 330, "Same request.", 104, FG, SANS, 800)
             + f'<text x="120" y="456" font-family="{MONO}" font-weight="800" font-size="104">'
               f'<tspan fill="{GREEN}">{reused:.0f} ms</tspan><tspan fill="{FG}" font-family="{SANS}">,</tspan></text>'
             + f'<text x="120" y="582" font-family="{SANS}" font-weight="800" font-size="104" fill="{FG}">then '
               f'<tspan font-family="{MONO}" fill="{RED}">{new:.0f} ms</tspan>.</text>')
    x0, scale = 1080, 700 / new
    bars = []
    for y, mode in ((300, "reused"), (640, "new")):
        x = x0
        bars.append(text(x0, y - 24, "reused" if mode == "reused" else "new connection", 32, MUTED, MONO, 700))
        for key, v, color, label in segments(a, mode):
            w = v * scale
            if w > 0.5:
                bars.append(rect(x + 2, y, max(w - 4, 2), 110, color, rx=8))
            if label and w > 60:
                bars.append(text(x + w / 2, y + 70, label, 36, FG, MONO, 800, "middle"))
            if key == "work":
                bars.append(line(x + w / 2, y + 110, x + w / 2, y + 150, FG, 3))
                bars.append(text(x + w / 2, y + 190, f"server {a[mode]['app']['50']:.1f} ms", 30, FG, MONO, 800, "middle"))
            x += w
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{title}{rect(122, 640, 160, 10, AMBER, rx=5)}'
            f'{text(122, 730, "same bytes,", 36, MUTED, MONO, 400)}'
            f'{text(122, 780, "nothing broken", 36, MUTED, MONO, 400)}'
            f'{"".join(bars)}'
            f'<svg x="120" y="935" width="80" height="80" viewBox="0 0 512 512">{LOGO}</svg>{brand}'
            f'{text(1800, 990, "tested on AWS, Frankfurt to London · archemist.dev", 30, MUTED, MONO, 400, "end")}</svg>')


DIAGRAMS = {"Response - 1 Timeline": timeline, "Response - 2 Load": knee,
            "Response - 3 Fan-out": waffle, "Response - Cover": cover}
SIZES = {"Response - Cover": (1920, 1080)}
if __name__ == "__main__":
    out = Path(sys.argv[1])
    data = load_runs()
    out.mkdir(parents=True, exist_ok=True)
    fonts = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800'
             '&family=JetBrains+Mono:wght@400;700;800&display=block" rel="stylesheet">')
    with tempfile.TemporaryDirectory() as tmp:
        for name, fn in DIAGRAMS.items():
            page = Path(tmp) / "d.html"
            page.write_text(f'<!doctype html><html><head><meta charset="utf-8">{fonts}'
                            f'<style>html,body{{margin:0;background:{BG}}}</style></head><body>{fn(data)}</body></html>')
            w, h = SIZES.get(name, (W, H))
            subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--window-size={w},{h}",
                            f"--force-device-scale-factor={1 if name in SIZES else 2}", "--virtual-time-budget=8000",
                            f"--screenshot={out / (name + '.png')}", page.as_uri()],
                           check=True, capture_output=True)
            print(out / f"{name}.png")
