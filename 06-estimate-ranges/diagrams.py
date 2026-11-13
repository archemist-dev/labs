"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad).

Usage: python3 diagrams.py OUT_DIR
Numbers come from summary-sigma0.5.json (run python3 simulate.py first); the histogram
re-draws the same 10,000 evaluation projects from simulate.py's seeds.
Needs Google Chrome; fonts load from Google Fonts.
"""
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import simulate

HERE = Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1600, 900
BG, FG, MUTED, GRAY, LIGHT = "#1b1d21", "#f2efe9", "#8a8f98", "#5c6370", "#9aa1ab"
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#d4a017"
PANEL, GRID = "#24272c", "#2c3036"
SANS, MONO = "Inter", "JetBrains Mono"
ROWS = (("0.25", "familiar work"), ("0.5", "default"), ("1.0", "new domain"))

DEFS = f"""<defs>
<linearGradient id="gRed" x1="0" x2="1"><stop offset="0" stop-color="{RED}" stop-opacity="0.75"/><stop offset="1" stop-color="{RED}"/></linearGradient>
<linearGradient id="gGreen" x1="0" x2="1"><stop offset="0" stop-color="{GREEN}" stop-opacity="0.75"/><stop offset="1" stop-color="{GREEN}"/></linearGradient>
<linearGradient id="vRed" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{RED}"/><stop offset="1" stop-color="{RED}" stop-opacity="0.45"/></linearGradient>
<linearGradient id="vGreen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{GREEN}"/><stop offset="1" stop-color="{GREEN}" stop-opacity="0.45"/></linearGradient>
<pattern id="hatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<rect width="18" height="18" fill="{RED}" fill-opacity="0.85"/><rect width="7" height="18" fill="{BG}" fill-opacity="0.22"/></pattern>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>"""


def text(x, y, s, size, color=FG, font=SANS, weight=700, anchor="start", extra=""):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}"{extra}>{s}</text>')


def rect(x, y, w, h, fill="none", stroke="none", rx=14, dash=None, sw=4):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w, 0):.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"{d}/>')


def line(x1, y1, x2, y2, color, sw=4, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round"{d}/>')


def circle(x, y, r, fill, stroke="none", sw=0, extra=""):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{extra}/>'


SPACED = ' letter-spacing="6"'


def frame(title, subtitle, body):
    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, W, H, BG, rx=0)}{text(80, 120, title, 72, weight=800)}'
            f'{rect(80, 146, 120, 8, AMBER, rx=4)}{text(80, 210, subtitle, 30, MUTED, MONO, 400)}{body}'
            f'{text(80, H - 40, "ARCHEMIST", 24, MUTED, MONO, 800, extra=SPACED)}</svg>')


LOGO = """<g transform="translate(0,-13)"><defs><clipPath id="liquid"><rect x="0" y="232" width="512" height="280"/></clipPath></defs>
<circle cx="256" cy="320" r="108" fill="#d4a017" clip-path="url(#liquid)"/>
<path d="M210,104 V194 A134,134,0,1,0,302,194 V104" fill="none" stroke="#f2efe9" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="184" y="72" width="144" height="36" rx="14" fill="#f2efe9"/>
<circle cx="264" cy="208" r="11" fill="#d4a017"/><circle cx="242" cy="174" r="8" fill="#d4a017"/><circle cx="266" cy="142" r="6" fill="#d4a017"/>
<path d="M209,293 V320 H236 M276,320 H303 V347" fill="none" stroke="#1b1d21" stroke-width="14" stroke-linejoin="round"/>
<circle cx="209" cy="274" r="19" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
<rect x="236" y="300" width="40" height="40" rx="6" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
<circle cx="303" cy="366" r="19" fill="#d4a017" stroke="#1b1d21" stroke-width="14"/>
</g>"""


def load():
    data = json.loads((HERE / "summary-sigma0.5.json").read_text())
    rng = random.Random("eval-0.5")
    data["outcomes"] = [simulate.actual_days(rng, 0.5) / simulate.DEVELOPERS for _ in range(simulate.RUNS)]
    return data


def on_time(data, sigma, plan):
    return data["sensitivity"][sigma]["plans"][plan]["on_time_pct"]


def cover(data):
    """1920x1080: on time for the single number vs the P85 date, by how wild the work is."""
    cw, ch = 1920, 1080
    left = 640
    span = 1080
    b = [text(120, 190, "Honest estimates.", 96, FG, SANS, 800),
         text(120, 300, f'On time up to <tspan fill="{RED}">~37%</tspan>.', 96, FG, SANS, 800),
         rect(122, 340, 160, 10, AMBER, rx=5),
         rect(left, 392, 26, 26, RED, rx=6), text(left + 40, 415, "sum of estimates", 30, LIGHT, MONO, 400),
         rect(left + 420, 392, 26, 26, GREEN, rx=6), text(left + 460, 415, "P85 date", 30, LIGHT, MONO, 400)]
    for i, (sigma, label) in enumerate(ROWS):
        y = 470 + i * 170
        one = on_time(data, sigma, "sum of estimates")
        p85 = on_time(data, sigma, "Monte Carlo P85")
        b += [rect(120, y - 10, 1680, 150, PANEL, rx=18),
              text(160, y + 82, label, 48, FG, SANS, 800),
              rect(left, y + 18, span, 52, GRID, rx=10),
              rect(left, y + 18, span * one / 100, 52, "url(#gRed)", rx=10),
              text(left + span * one / 100 + 20, y + 60, f"{one:.0f}%", 44, RED, MONO, 800),
              rect(left, y + 86, span, 26, GRID, rx=8),
              rect(left, y + 86, span * p85 / 100, 26, "url(#gGreen)", rx=8),
              text(left + span + 24, y + 110, f"{p85:.0f}%", 32, GREEN, MONO, 800)]
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{"".join(b)}'
            f'<svg x="120" y="975" width="72" height="72" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(208, 1024, "ARCHEMIST", 30, AMBER, MONO, 800, extra=SPACED)}'
            f'{text(1800, 1024, "one sprint · 9 tasks · 10,000 simulated projects · archemist.dev", 28, MUTED, MONO, 400, "end")}</svg>')


def lopsided(data):
    """Histogram of project length in working days, with the single number and the P85 date."""
    lo, hi = 6, 22
    left, right = 140, 1520
    top_y, base_y = 440, 740
    plans = data["main"]["plans"]
    plan = plans["sum of estimates"]["deadline_workdays"]
    p85 = plans["Monte Carlo P85"]["deadline_workdays"]
    counts = [0] * (hi - lo)
    for d in data["outcomes"]:
        i = int(d) - lo
        if 0 <= i < len(counts):
            counts[i] += 1
    peak = max(counts)
    bw = (right - left) / (hi - lo)

    def xs(day):
        return left + (day - lo) * bw

    b = [line(left, base_y, right, base_y, GRID, 3)]
    for i, c in enumerate(counts):
        day = lo + i
        h = (base_y - top_y) * c / peak
        b.append(rect(xs(day) + 4, base_y - h, bw - 8, h, "url(#vGreen)" if day < plan else "url(#vRed)", rx=6))
    for day in range(6, hi + 1, 2):
        b.append(text(xs(day), base_y + 46, str(day), 28, MUTED, MONO, 400, "middle"))
    b.append(text(right, base_y + 92, "working days", 28, MUTED, MONO, 400, "end"))
    ok = plans["sum of estimates"]["on_time_pct"]
    small = f'<tspan font-family="{SANS}" font-size="32" font-weight="700" fill="{LIGHT}">'
    b += [line(xs(plan), 290, xs(plan), base_y, FG, 5),
          text(xs(plan) - 20, 330, f"estimate · {plan} days", 40, FG, SANS, 800, "end"),
          text(xs(plan) - 20, 410, f"{ok:.0f}%{small} on time</tspan>", 60, GREEN, MONO, 800, "end"),
          text(xs(plan) + 22, 410, f"{100 - ok:.0f}%{small} late</tspan>", 60, RED, MONO, 800),
          line(xs(p85), 290, xs(p85), base_y, GREEN, 5, "14 10"),
          text(xs(p85) + 20, 330, f"P85 · {p85} days", 40, GREEN, SANS, 800)]
    return frame("Overruns are lopsided.", "project length over 10,000 runs · every task estimate honest", "".join(b))


def buffer(data):
    """Dumbbell rows: on time for the sum, sum + 20% and P85, by how wild the work is; 85% target line."""
    left, right = 520, 1480

    def xs(pct):
        return left + (right - left) * pct / 100

    marks = (("sum of estimates", RED, "sum"), ("sum + 20%", LIGHT, "sum + 20%"), ("Monte Carlo P85", GREEN, "P85 date"))
    b = [text(xs(85), 290, "85% target", 28, GREEN, MONO, 400, "middle")]
    for i, (_, color, short) in enumerate(marks):
        lx = 520 + i * 340
        b += [circle(lx + 14, 838, 12, color), text(lx + 36, 848, short, 28, LIGHT, MONO, 400)]
    for r, (sigma, label) in enumerate(ROWS):
        y = 380 + r * 170
        vals = [on_time(data, sigma, name) for name, _, _ in marks]
        b += [rect(60, y - 70, 1480, 140, PANEL, rx=18),
              text(100, y + 16, label, 44, FG, SANS, 800),
              line(xs(0), y, xs(100), y, GRID, 6),
              line(xs(85), y - 26, xs(85), y + 26, GREEN, 3, "4 8"),
              line(xs(min(vals)), y, xs(max(vals)), y, GRAY, 10)]
        for j, ((_, color, _), v) in enumerate(zip(marks, vals)):
            if color == GREEN:
                b.append(circle(xs(v), y, 26, color, extra=' filter="url(#glow)" opacity="0.55"'))
            b.append(circle(xs(v), y, 20, color, BG, 5))
            ty = y - 34 if j == 2 else y + 58
            b.append(text(xs(v), ty, f"{v:.0f}%", 34, color, MONO, 800, "middle"))
    return frame("A flat 20% is right by luck.", "share of 10,000 projects on time · same 9 tasks", "".join(b))


def nobody_sized(data):
    """The story as a timeline in working days: the estimate, the date set, what happened."""
    left, right = 420, 1500
    day = (right - left) / 10

    def xs(d):
        return left + d * day

    b = []
    for d in range(0, 11):
        b += [line(xs(d), 300, xs(d), 760, GRID, 2), text(xs(d), 800, f"{d}", 30, MUTED, MONO, 400, "middle")]
    b.append(text(right, 846, "working days", 28, MUTED, MONO, 400, "end"))
    b += [line(xs(5), 300, xs(5), 628, LIGHT, 4, "12 10"),
          text(xs(5), 288, "release date", 30, LIGHT, MONO, 700, "middle"),
          text(80, 395, "estimate", 44, FG, SANS, 800),
          rect(xs(0), 340, 2.5 * day, 90, GRAY, rx=12), text(xs(1.25), 398, "development", 34, FG, MONO, 800, "middle"),
          text(80, 545, "date set", 44, FG, SANS, 800),
          rect(xs(0), 490, 5 * day, 90, "none", LIGHT, rx=12, dash="12 10", sw=4),
          text(xs(2.5), 548, "2× estimate", 34, LIGHT, MONO, 800, "middle"),
          text(80, 695, "actual", 44, FG, SANS, 800),
          rect(xs(0), 640, 2.5 * day, 90, GRAY, rx=12), text(xs(1.25), 698, "development", 34, FG, MONO, 800, "middle"),
          rect(xs(2.5) + 8, 640, 7.5 * day - 8, 90, "url(#hatch)", rx=12),
          text(xs(6.25), 680, "another team's priorities", 30, FG, MONO, 800, "middle"),
          text(xs(6.25), 716, "QA edge cases", 30, FG, MONO, 800, "middle"),
          text(xs(10), 290, "4×", 56, RED, MONO, 800, "end")]
    return frame("The work nobody sized.", "half-week estimate · the release took four", "".join(b))


DIAGRAMS = {"Estimates - Cover": cover, "Estimates - 1 Lopsided": lopsided,
            "Estimates - 2 Buffer by luck": buffer, "Estimates - 3 Nobody sized": nobody_sized}
SIZES = {"Estimates - Cover": (1920, 1080)}
if __name__ == "__main__":
    out = Path(sys.argv[1])
    data = load()
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
