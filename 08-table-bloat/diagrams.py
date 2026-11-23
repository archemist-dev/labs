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
<linearGradient id="gRed" x1="0" x2="1"><stop offset="0" stop-color="{RED}"/><stop offset="1" stop-color="{RED}"/></linearGradient>
<linearGradient id="gGreen" x1="0" x2="1"><stop offset="0" stop-color="{GREEN}"/><stop offset="1" stop-color="{GREEN}"/></linearGradient>
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
            f'<svg x="80" y="{H - 78}" width="48" height="48" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(138, H - 40, "ARCHEMIST", 24, MUTED, MONO, 800, extra=SPACED)}</svg>')


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
    """1920x1080: the table file before and after one slow read, and where it ended in production."""
    import random
    rep = data["hour"]["long_report"][1]
    start, end, free = rep["table"][0], rep["table"][1], rep["free_mb"]
    cw, ch = 1920, 1080
    b = [text(120, 190, "Nobody inserted.", 104, FG, SANS, 800),
         text(120, 310, f'The table grew <tspan fill="{RED}">{end / start:.1f}x.</tspan>', 104, FG, SANS, 800),
         rect(122, 350, 160, 10, AMBER, rx=5),
         text(120, 430, f'one slow read · 60 min <tspan fill="{RED}">→ disk full → database read-only</tspan>',
              40, LIGHT, MONO, 700)]
    per, cell, gap = 4, 54, 10
    n_s, n_e, n_free = round(start / per), round(end / per), round(free / per)
    empty = set(random.Random(8).sample(range(n_e), n_free))

    def grid(n, x0, y0, cols, empt):
        out = []
        for i in range(n):
            x, y = x0 + (i % cols) * (cell + gap), y0 + (i // cols) * (cell + gap)
            out.append(rect(x, y, cell, cell, "none", RED, rx=6, dash="7 6", sw=3) if i in empt
                       else rect(x, y, cell, cell, GRAY, rx=6))
        return out

    b += [text(120, 530, f"before · {start} MB", 34, LIGHT, MONO, 800)] + grid(n_s, 120, 560, 6, set())
    b += [text(600, 530, f"after · {end} MB, {free} MB empty", 34, RED, MONO, 800)] + grid(n_e, 600, 560, 17, empty)
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{"".join(b)}'
            f'<svg x="120" y="975" width="72" height="72" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(208, 1024, "ARCHEMIST", 30, AMBER, MONO, 800, extra=SPACED)}'
            f'{text(1800, 1024, "archemist.dev", 28, MUTED, MONO, 400, "end")}</svg>')


def tech_icon(name, x, y, size):
    """An official tech logo (public SVG next to this script), nested at (x, y), size px tall."""
    svg = (HERE / f"{name}.svg").read_text(encoding="utf-8")
    svg = svg[svg.index("<svg"):]
    head, body = svg.split(">", 1)
    vb = re.search(r'viewBox="([^"]+)"', head).group(1)
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}">{body}'


def cover_medium(data):
    """The cover with the PostgreSQL logo and name, for Medium (Lessons, week 8 cover experiment, tried early)."""
    page = cover(data)
    badge = (tech_icon("postgresql", 1510, 50, 240) +
             text(1630, 345, "PostgreSQL", 36, FG, MONO, 800, "middle"))
    return page[:-len("</svg>")] + badge + "</svg>"


# Light mode (Javlon 2026-11-23): one color map over the finished SVG, so every diagram matches.
# White page with a thin border (Medium, LinkedIn and the site's light theme are white), darker gray boxes,
# solid red and green bars and the flask in the footer (both now in the dark versions too).
LIGHT_MAP = {"#1b1d21": "#ffffff", "#f2efe9": "#1b1d21", "#9aa1ab": "#3f444d", "#8a8f98": "#6b717b",
             "#5c6370": "#868e9c", "#e5484d": "#d1343a", "#34c77b": "#1f9d5c", "#24272c": "#f1efea",
             "#2c3036": "#e3e1dc"}
LIGHT_BORDER = "#e3e1dc"


def light(fn):
    """Wrap a diagram: same drawing on white. The flask keeps its dark details; only its light outline turns dark."""
    logo = LOGO.replace("#f2efe9", "#1b1d21")

    def draw(data):
        svg = fn(data).replace(LOGO, "@@LOGO@@").replace("url(#gRed)", RED).replace("url(#gGreen)", GREEN)
        svg = re.sub("|".join(LIGHT_MAP), lambda m: LIGHT_MAP[m.group(0)], svg)
        svg = svg.replace("@@LOGO@@", logo)
        w, h = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg).groups()
        border = (f'<rect x="1" y="1" width="{int(w) - 2}" height="{int(h) - 2}" fill="none" '
                  f'stroke="{LIGHT_BORDER}" stroke-width="2"/>')
        return svg[:-len("</svg>")] + border + "</svg>"
    return draw


cover_medium_light = light(cover_medium)

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
          text(mx + 18, 340, "and keeps reading", 26, LIGHT, MONO, 400),
          text((x0 + mx) / 2, base_y - 60, "cleaned", 36, GREEN, SANS, 800, "middle"),
          text(mx + 18, 470, "kept", 52, RED, SANS, 800),
          text(mx + 18, 512, "until the report ends", 26, LIGHT, MONO, 400),
          text(x0, base_y + 76, f"1 column = 1 minute · 1 block ≈ {per_min / 1000:.0f}k old row versions", 28, MUTED, MONO, 400),
          text(right, base_y + 76, "time →", 28, MUTED, MONO, 400, "end")]
    return frame("The report runs. Cleanup stops.", "old row versions left by updates · cleanup (vacuum) per minute", "".join(b))


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
    b += [text(rp[-1][0] - 10, rp[-1][1] - 24, f"{d_max / 1e6:.1f}M old row versions", 40, RED, MONO, 800, "end"),
          text(x0 + w, y0 + h - 18, "no long report: steady", 26, LIGHT, MONO, 400, "end")]
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
    b += [text(x0, ty + 110, f"each line = 1 cleanup run · {runs} runs", 36, FG, MONO, 800),
          text(x0 + w, ty + 110, "cleaned: 0", 36, RED, MONO, 800, "end")]
    return frame(f"{runs} cleanups. Nothing cleaned.", "one report open for 60 min · 500 order updates/s", "".join(b))


HOLDS = (("long_report", "slow report on the primary", "url(#gRed)", "one query running for 10 min"),
         ("idle_tx", "forgotten open transaction", RED, "BEGIN, one read, then idle"),
         ("replica_feedback", "report moved to a replica", "url(#gRed)", "feedback on: the primary keeps old rows for it"))
STOPS = (("idle_timeout", "end idle transactions after 60 s", "url(#gGreen)", "idle_in_transaction_session_timeout"),
         ("report_timeout", "end slow queries after 60 s", "url(#gGreen)", "statement_timeout"),
         ("replica_no_feedback", "report moved to a replica", "url(#gGreen)", "feedback off: the replica cancels the report"))


def fixes(data):
    """Table growth after 10 minutes held: what holds cleanup back vs what stops it."""
    grow = {n: v[1]["table"][1] - v[1]["table"][0] for n, v in data["ten"].items()}
    left, span, bar_h, step = 880, 560, 48, 76
    peak = max(grow[n] for n, *_ in HOLDS)
    base_x = left + span * grow["baseline"] / peak
    b = []

    def rows(items, top, color):
        out = []
        for i, (name, label, fill, sub) in enumerate(items):
            y = top + i * step
            g = grow[name]
            bw = max(span * g / peak, 14)
            out += [text(left - 28, y + 24, label, 32, FG, SANS, 700, "end"),
                    text(left - 28, y + 58, sub, 22, MUTED, MONO, 400, "end"),
                    rect(left, y, bw, bar_h, fill, rx=10),
                    text(left + bw + 20, y + bar_h * 0.74, f"+{g} MB", 32, color, MONO, 800)]
        return out

    b += [text(80, 290, "grows the table", 34, RED, MONO, 800)]
    b += rows(HOLDS, 312, RED)
    b += [text(80, 578, "stops it · cheapest first", 34, GREEN, MONO, 800)]
    b += rows(STOPS, 600, GREEN)
    b += [line(base_x, 300, base_x, 812, LIGHT, 2, "6 8"),
          text(base_x + 10, 284, f"no long report: +{grow['baseline']} MB", 24, LIGHT, MONO, 400)]
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
    b += [text(x0, 290, f"no long report · {size_base} MB", 30, LIGHT, MONO, 800)]
    b += grid(n_base, 310, set())
    b += [text(right, 290, f"a scan reads {p_base:,.0f} pages", 30, LIGHT, MONO, 800, "end")]
    top2 = 310 + ((n_base - 1) // per_row + 1) * (cell + gap) + 80
    b += [text(x0, top2 - 20, f"after the report · {size_rep} MB, {free} MB empty", 30, RED, MONO, 800)]
    b += grid(n_rep, top2, empty)
    b += [text(right, top2 - 20, f"a scan reads {p_rep:,.0f} pages", 30, RED, MONO, 800, "end")]
    rows_rep = (n_rep - 1) // per_row + 1
    ly = top2 + rows_rep * (cell + gap) + 40
    b += [rect(x0, ly - 22, cell, cell * 0.6, GRAY, rx=4), text(x0 + cell + 16, ly, "pages with rows", 26, LIGHT, MONO, 400),
          rect(x0 + 360, ly - 22, cell, cell * 0.6, "none", RED, rx=4, dash="6 5", sw=3),
          text(x0 + 360 + cell + 16, ly, f"empty pages, still read · 1 box ≈ {per} MB", 26, LIGHT, MONO, 400)]
    return frame("The report ended. The space stayed.", "orders table file · after the 60 min report", "".join(b))


DIAGRAMS = {"Bloat - Cover": cover, "Bloat - 1 Versions": versions, "Bloat - 2 Growth": growth,
            "Bloat - 3 Fixes": fixes, "Bloat - 4 After": after, "Bloat - Cover Medium": cover_medium,
            "Bloat - Cover Medium Light": cover_medium_light,
            "Bloat - 1 Versions Light": light(versions), "Bloat - 2 Growth Light": light(growth),
            "Bloat - 3 Fixes Light": light(fixes), "Bloat - 4 After Light": light(after)}
SIZES = {"Bloat - Cover": (1920, 1080), "Bloat - Cover Medium": (1920, 1080),
         "Bloat - Cover Medium Light": (1920, 1080)}

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
