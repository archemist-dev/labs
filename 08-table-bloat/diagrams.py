"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad,
solid red = silent failure). Usage: python3 diagrams.py OUT_DIR
Numbers are parsed from the raw run logs (run 1 of each). Needs Google Chrome; fonts from Google Fonts.
"""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
LOG_10 = HERE / "results-ec2-t3small-2026-11-18.txt"
LOG_60 = HERE / "results-ec2-t3small-hour-2026-11-18.txt"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
W, H = 1600, 900
BG, FG, MUTED, GRAY, LIGHT = "#1b1d21", "#f2efe9", "#8a8f98", "#5c6370", "#9aa1ab"
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#d4a017"
PANEL, GRID = "#24272c", "#2c3036"
SANS, MONO = "Inter", "JetBrains Mono"
DEFS = f"""<defs>
<linearGradient id="gRed" x1="0" x2="1"><stop offset="0" stop-color="{RED}" stop-opacity="0.75"/><stop offset="1" stop-color="{RED}"/></linearGradient>
<linearGradient id="gGreen" x1="0" x2="1"><stop offset="0" stop-color="{GREEN}" stop-opacity="0.75"/><stop offset="1" stop-color="{GREEN}"/></linearGradient>
<linearGradient id="aRed" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{RED}" stop-opacity="0.35"/><stop offset="1" stop-color="{RED}" stop-opacity="0"/></linearGradient>
</defs>"""
SPACED = ' letter-spacing="6"'


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


def arrow(x1, y1, x2, y2, color=LIGHT, sw=4, dash=None):
    """A line with a head at (x2, y2); horizontal or vertical only."""
    if y1 == y2:
        d = 1 if x2 > x1 else -1
        head = f"{x2},{y2} {x2 - d * 18},{y2 - 10} {x2 - d * 18},{y2 + 10}"
        body = line(x1, y1, x2 - d * 14, y2, color, sw, dash)
    else:
        d = 1 if y2 > y1 else -1
        head = f"{x2},{y2} {x2 - 10},{y2 - d * 18} {x2 + 10},{y2 - d * 18}"
        body = line(x1, y1, x2, y2 - d * 14, color, sw, dash)
    return body + f'<polygon points="{head}" fill="{color}"/>'


def box(x, y, w, h, label, fill=GRAY, color=FG, size=34, stroke="none", dash=None):
    return (rect(x, y, w, h, fill, stroke, rx=14, dash=dash) +
            text(x + w / 2, y + h / 2 + size * 0.36, label, size, color, MONO, 800, "middle"))


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


def parse(path):
    """Sections in log order: (variant, sample rows as dicts, summary dict)."""
    lines = path.read_text().splitlines()
    out = []
    for i, ln in enumerate(lines):
        if not (ln.startswith("== ") and i + 1 < len(lines) and lines[i + 1].startswith("t_s,")):
            continue
        keys = lines[i + 1].split(",")
        rows, j = [], i + 2
        while not lines[j].startswith("updates"):
            rows.append({k: (v if k == "phase" else float(v)) for k, v in zip(keys, lines[j].split(","))})
            j += 1
        s = lines[j] + " " + lines[j + 1]
        summary = {
            "table": tuple(int(n) for n in re.search(r"table_mb (\d+) -> (\d+)", s).groups()),
            "index": tuple(int(n) for n in re.search(r"indexes_mb (\d+) -> (\d+)", s).groups()),
            "free_mb": int(re.search(r"free_space_mb (\d+)", s).group(1)),
            "outcome": re.search(r"outcome: (.*?)\s+table_mb", s).group(1),
        }
        out.append((ln[3:], rows, summary))
    return out


def load():
    ten = {}
    for name, rows, summary in parse(LOG_10):
        ten.setdefault(name, (rows, summary))  # run 1
    hour = {}
    for name, rows, summary in parse(LOG_60):
        hour.setdefault(name, (rows, summary))  # run 1, then the 60 min baseline
    return {"ten": ten, "hour": hour}


def growth_chart(data, x0, y0, w, h, label_size=30, show_axis=True):
    """Table size over the hour: slow report (red) vs nothing held (gray)."""
    rep, base = data["hour"]["long_report"][0], data["hour"]["baseline"][0]
    t_max = max(r["t_s"] for r in rep)
    lo, hi = 100, 350

    def pt(r):
        return x0 + w * r["t_s"] / t_max, y0 + h - h * (r["table_mb"] - lo) / (hi - lo)

    b = []
    for mb in (100, 200, 300):
        y = y0 + h - h * (mb - lo) / (hi - lo)
        b += [line(x0, y, x0 + w, y, GRID, 2)]
        if show_axis:
            b.append(text(x0 - 20, y + 10, f"{mb} MB", 26, MUTED, MONO, 400, "end"))
    hold_end = max(r["t_s"] for r in rep if r["phase"] == "hold")
    hx = x0 + w * hold_end / t_max
    b += [rect(x0, y0 - 70, hx - x0, 40, "url(#gRed)", rx=8),
          text(x0 + 20, y0 - 40, "slow report running · 60 min", 26, BG, MONO, 800)]
    rp = [pt(r) for r in rep]
    area = " ".join(f"{x:.1f},{y:.1f}" for x, y in rp)
    b.append(f'<polygon points="{x0:.1f},{y0 + h:.1f} {area} {rp[-1][0]:.1f},{y0 + h:.1f}" fill="url(#aRed)"/>')
    for series, color in ((base, GRAY), (rep, RED)):
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in map(pt, series))
        b.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="6" '
                 f'stroke-linejoin="round" stroke-linecap="round"/>')
    ex, ey = rp[-1]
    bx, by = pt(base[-1])
    b += [text(ex + 20, ey + 14, f'{data["hour"]["long_report"][1]["table"][1]} MB', label_size + 8, RED, MONO, 800),
          text(bx + 20, by + 12, f'{data["hour"]["baseline"][1]["table"][1]} MB', label_size, LIGHT, MONO, 800),
          text(bx + 20, by + 48, "nothing held", 24, MUTED, MONO, 400)]
    return b


def cover(data):
    """1920x1080: the hour-long chart behind one claim."""
    start, end = data["hour"]["long_report"][1]["table"]
    cw, ch = 1920, 1080
    b = [text(120, 190, "Nobody inserted.", 104, FG, SANS, 800),
         text(120, 310, f'The table grew <tspan fill="{RED}">{end / start:.1f}x.</tspan>', 104, FG, SANS, 800),
         rect(122, 350, 160, 10, AMBER, rx=5),
         text(120, 430, "one slow read · Postgres · 60 min", 40, LIGHT, MONO, 700)]
    b += growth_chart(data, 300, 580, 1300, 340, 34)
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{"".join(b)}'
            f'<svg x="120" y="975" width="72" height="72" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(208, 1024, "ARCHEMIST", 30, AMBER, MONO, 800, extra=SPACED)}'
            f'{text(1800, 1024, "archemist.dev", 28, MUTED, MONO, 400, "end")}</svg>')


def versions(data):
    """Dead row versions per minute over the hour: removed before the report's snapshot, kept after it."""
    rep = data["hour"]["long_report"][0]
    hold = [r for r in rep if r["phase"] == "hold"]
    per_min = (hold[-1]["dead"] - hold[0]["dead"]) / (len(hold) - 1)
    x0, base_y, col_w, gap, cell = 140, 720, 64, 14, 26
    cols, start_col = 18, 4
    b = []
    for c in range(cols):
        x = x0 + c * (col_w + gap)
        if c < start_col:
            b.append(rect(x, base_y - cell, col_w, cell, "none", GRAY, rx=6, dash="8 6", sw=3))
            continue
        for k in range(c - start_col + 1):
            y = base_y - (k + 1) * (cell + 4)
            if y < 330:
                break
            b.append(rect(x, y, col_w, cell, "url(#gRed)", rx=6))
    mx = x0 + start_col * (col_w + gap) - gap / 2
    right = x0 + cols * (col_w + gap) - gap
    b += [line(x0, base_y + 18, right, base_y + 18, GRAY, 3),
          line(mx, 300, mx, base_y + 40, RED, 5, "14 10"),
          text(mx + 18, 300, "report starts", 32, RED, MONO, 800),
          text(mx + 18, 340, "its snapshot", 26, LIGHT, MONO, 400),
          text((x0 + mx) / 2, base_y - 60, "removed", 36, GREEN, SANS, 800, "middle"),
          text(mx + 18, 470, "kept", 52, RED, SANS, 800),
          text(mx + 18, 512, "until the report ends", 26, LIGHT, MONO, 400),
          text(x0, base_y + 76, f"1 column = 1 minute · 1 block ≈ {per_min / 1000:.0f}k dead row versions", 28, MUTED, MONO, 400),
          text(right, base_y + 76, "time →", 28, MUTED, MONO, 400, "end")]
    return frame("Vacuum stops at the report's start.", "dead row versions · what vacuum may remove", "".join(b))


def growth(data):
    """Dead rows during the hour against autovacuum runs: every run removed nothing."""
    rep, base = data["hour"]["long_report"][0], data["hour"]["baseline"][0]
    hold = [r for r in rep if r["phase"] in ("start", "hold")]
    x0, y0, w, h = 160, 320, 1300, 290
    t_max = max(r["t_s"] for r in hold)
    d_max = max(r["dead"] for r in hold)

    def pt(r):
        return x0 + w * r["t_s"] / t_max, y0 + h - h * r["dead"] / d_max

    rp = [pt(r) for r in hold]
    area = " ".join(f"{x:.1f},{y:.1f}" for x, y in rp)
    b = [line(x0, y0 + h, x0 + w, y0 + h, GRAY, 3),
         f'<polygon points="{x0},{y0 + h} {area} {rp[-1][0]:.1f},{y0 + h}" fill="url(#aRed)"/>',
         f'<polyline points="{area}" fill="none" stroke="{RED}" stroke-width="6" stroke-linejoin="round"/>']
    bp = " ".join(f"{x0 + w * r['t_s'] / t_max:.1f},{y0 + h - h * r['dead'] / d_max:.1f}"
                  for r in base if r["t_s"] <= t_max)
    b.append(f'<polyline points="{bp}" fill="none" stroke="{GRAY}" stroke-width="6" stroke-linejoin="round"/>')
    b += [text(rp[-1][0] - 10, rp[-1][1] - 24, f"{d_max / 1e6:.1f}M dead rows", 40, RED, MONO, 800, "end"),
          text(x0 + w, y0 + h - 18, "nothing held: steady", 26, LIGHT, MONO, 400, "end")]
    runs = int(max(r["autovacuums"] for r in hold))
    ty = y0 + h + 40
    prev = hold[0]
    for r in hold[1:]:
        n = int(r["autovacuums"] - prev["autovacuums"])
        for k in range(n):
            t = prev["t_s"] + (r["t_s"] - prev["t_s"]) * (k + 0.5) / n
            x = x0 + w * t / t_max
            b.append(line(x, ty, x, ty + 50, LIGHT, 2))
        prev = r
    b += [text(x0, ty + 110, f"autovacuum runs: {runs}", 36, FG, MONO, 800),
          text(x0 + w, ty + 110, "rows removed: 0", 36, RED, MONO, 800, "end")]
    return frame(f"{runs} vacuum runs. Nothing removed.", "one report held open 60 min · 500 status updates/s", "".join(b))


HOLDS = (("long_report", "slow report on the primary", "url(#gRed)"),
         ("idle_tx", "idle open transaction", RED),
         ("replica_feedback", "report on replica, feedback on", "url(#gRed)"))
STOPS = (("idle_timeout", "idle timeout 60 s", "url(#gGreen)", ""),
         ("report_timeout", "statement timeout 60 s", "url(#gGreen)", ""),
         ("replica_no_feedback", "report on replica, feedback off", "url(#gGreen)", "report cancelled"))


def fixes(data):
    """Table growth after 10 minutes held: what holds cleanup back vs what stops it."""
    grow = {n: v[1]["table"][1] - v[1]["table"][0] for n, v in data["ten"].items()}
    left, span, bar_h, step = 760, 640, 50, 66
    peak = max(grow[n] for n, _, _ in HOLDS)
    base_x = left + span * grow["baseline"] / peak
    b = []

    def rows(items, top, color):
        out = []
        for i, item in enumerate(items):
            name, label, fill = item[:3]
            y = top + i * step
            g = grow[name]
            bw = max(span * g / peak, 14)
            out += [text(left - 28, y + bar_h * 0.72, label, 32, FG, SANS, 700, "end"),
                    rect(left, y, bw, bar_h, fill, rx=10),
                    text(left + bw + 20, y + bar_h * 0.74, f"+{g} MB", 32, color, MONO, 800)]
            if len(item) > 3 and item[3]:
                out.append(text(left + bw + 160, y + bar_h * 0.74, item[3], 26, LIGHT, MONO, 400))
        return out

    b += [text(80, 300, "holds cleanup back", 34, RED, MONO, 800)]
    b += rows(HOLDS, 326, RED)
    b += [text(80, 580, "stops it · cheapest first", 34, GREEN, MONO, 800)]
    b += rows(STOPS, 606, GREEN)
    b += [line(base_x, 290, base_x, 810, LIGHT, 2, "6 8"),
          text(base_x + 10, 845, f"nothing held: +{grow['baseline']} MB", 24, LIGHT, MONO, 400)]
    return frame("A timeout stops it. A replica may not.", "table growth in 10 min · start 120 MB", "".join(b))


def after(data):
    """The table file as pages after the hour: mostly empty, and a scan still reads every page."""
    import random
    rep, base = data["hour"]["long_report"], data["hour"]["baseline"]
    p_rep, p_base = rep[0][-1]["admin_filter_pages"], base[0][-1]["admin_filter_pages"]
    size_rep, size_base, free = rep[1]["table"][1], base[1]["table"][1], rep[1]["free_mb"]
    per, per_row, cell, gap, x0 = 4, 24, 44, 8, 120
    n_rep, n_base = round(size_rep / per), round(size_base / per)
    n_free = round(free / per)
    rnd = random.Random(8)
    empty = set(rnd.sample(range(n_rep), n_free))
    b = []

    def grid(n, top, empty_set):
        out = []
        for i in range(n):
            x = x0 + (i % per_row) * (cell + gap)
            y = top + (i // per_row) * (cell + gap)
            if i in empty_set:
                out.append(rect(x, y, cell, cell, "none", RED, rx=6, dash="6 5", sw=3))
            else:
                out.append(rect(x, y, cell, cell, GRAY, rx=6))
        return out

    right = x0 + per_row * (cell + gap) - gap
    b += [text(x0, 290, f"nothing held · {size_base} MB", 30, LIGHT, MONO, 800)]
    b += grid(n_base, 310, set())
    b += [text(right, 290, f"{p_base:,.0f} pages read", 30, LIGHT, MONO, 800, "end")]
    top2 = 310 + ((n_base - 1) // per_row + 1) * (cell + gap) + 80
    b += [text(x0, top2 - 20, f"after the report · {size_rep} MB, {free} MB empty", 30, RED, MONO, 800)]
    b += grid(n_rep, top2, empty)
    b += [text(right, top2 - 20, f"{p_rep:,.0f} pages read", 30, RED, MONO, 800, "end")]
    rows_rep = (n_rep - 1) // per_row + 1
    ly = top2 + rows_rep * (cell + gap) + 40
    b += [rect(x0, ly - 22, cell, cell * 0.6, GRAY, rx=4), text(x0 + cell + 16, ly, "rows", 26, LIGHT, MONO, 400),
          rect(x0 + 170, ly - 22, cell, cell * 0.6, "none", RED, rx=4, dash="6 5", sw=3),
          text(x0 + 170 + cell + 16, ly, f"empty · still scanned · each box ≈ {per} MB", 26, LIGHT, MONO, 400)]
    return frame("The report ended. The space stayed.", "orders table file · after the 60 min report", "".join(b))


DIAGRAMS = {"Bloat - Cover": cover, "Bloat - 1 Versions": versions, "Bloat - 2 Growth": growth,
            "Bloat - 3 Fixes": fixes, "Bloat - 4 After": after}
SIZES = {"Bloat - Cover": (1920, 1080)}

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
                            f'<style>html,body{{margin:0;background:{BG}}}</style></head><body>{fn(data)}</body></html>', encoding="utf-8")
            w, h = SIZES.get(name, (W, H))
            subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--window-size={w},{h}",
                            f"--force-device-scale-factor={1 if name in SIZES else 2}", "--virtual-time-budget=8000",
                            f"--screenshot={out / (name + '.png')}", page.as_uri()],
                           check=True, capture_output=True)
            print(out / f"{name}.png")
