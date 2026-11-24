"""Render the article diagrams and cover options as PNG (Archemist style: charcoal, big type, green = win,
gray = neutral, red = bad). Usage: python3 diagrams.py OUT_DIR
Numbers come from the summaries of the reference runs (summary-*.json). Needs Google Chrome; fonts from Google Fonts.
Helpers and light() are copied from 08-table-bloat/diagrams.py so every week matches.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
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


def tech_icon(name, x, y, size):
    """An official tech logo (public SVG next to this script), nested at (x, y), size px tall."""
    svg = (HERE / f"{name}.svg").read_text(encoding="utf-8")
    svg = svg[svg.index("<svg"):]
    head, body = svg.split(">", 1)
    vb = re.search(r'viewBox="([^"]+)"', head).group(1)
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}">{body}'


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



def summary(name):
    return json.loads((HERE / name).read_text())


def strategy(data, name):
    return next(s for s in data["strategies"] if s["strategy"] == name)


def load():
    orm1, orm2 = summary("summary-orm-run1.json"), summary("summary-orm-run2.json")
    bat1, bat2 = summary("summary-batched-run1.json"), summary("summary-batched-run2.json")
    del1, del2 = summary("summary-batched-delete10-run1.json"), summary("summary-batched-delete10-run2.json")
    runs = {"orm": (orm1, orm2), "batched": (bat1, bat2), "batched_delete": (del1, del2)}
    # The timeline shows one edit: run 1's edit whose paid count is the run's median (41 rebuilds).
    edits = strategy(orm1, "delete")["per_edit"]
    median_paid = strategy(orm1, "delete")["paid"]["median"]
    edit = next(e for e in edits if e["paid"] == median_paid)
    return {"runs": runs, "edit": edit, "build_orm": orm1["build_alone"]["build_ms_p50"],
            "rps": orm1["settings"]["rps"], "pool": orm1["settings"]["pool_max"]}


def both(data, build, name, key):
    """(min, max) of a strategy's per-run median over the two runs."""
    vals = [strategy(r, name)[key]["median"] for r in data["runs"][build]]
    return min(vals), max(vals)


def span(lo, hi, fmt="{:,.0f}"):
    return fmt.format(lo) if lo == hi else f"{fmt.format(lo)}–{fmt.format(hi)}"


def stampede(data):
    """One edit, second by second: requests served from cache, waited for a rebuild, or failed."""
    e = data["edit"]
    series = e["series"]
    x0, base, bw, gap, top = 200, 730, 72, 22, 420
    h = base - top
    per = h / data["rps"]
    b = [line(x0 - 20, base, x0 + len(series) * (bw + gap), base, GRAY, 3)]
    for i, r in enumerate(series):
        x = x0 + i * (bw + gap)
        failed, waited = r["failed"], r["waited"]
        served = r["requests"] - failed - waited
        y = base
        for n, kind in ((served, "served"), (waited, "waited"), (failed, "failed")):
            if n <= 0:
                continue
            hh = n * per
            y -= hh
            if kind == "served":
                b.append(rect(x, y, bw, hh, GRAY, rx=6))
            elif kind == "waited":
                b.append(rect(x + 2, y + 2, bw - 4, hh - 4, "none", RED, rx=6, dash="7 6", sw=3))
            else:
                b.append(rect(x, y, bw, hh, RED, rx=6))
        b.append(text(x + bw / 2, base + 36, f'{r["s"]:+d}' if r["s"] else "0", 24, MUTED, MONO, 400, "middle"))
    ex = x0 + 2 * (bw + gap) - gap / 2
    b += [line(ex, top - 110, ex, base + 10, FG, 4, "12 9"),
          text(ex - 14, top - 80, "menu edited", 30, FG, MONO, 800, "end"),
          text(ex + 14, top - 80, f'{e["rebuilds"]} readers rebuild the same menu', 30, RED, MONO, 800),
          text(ex + 14, top - 40, f'all {data["pool"]} database connections busy · the rest fail after 5 s', 24,
               LIGHT, MONO, 400)]
    ly = base + 96
    lx = 560
    b += [rect(lx, ly - 24, 40, 28, GRAY, rx=4), text(lx + 56, ly, "from the cache", 26, LIGHT, MONO, 400),
          rect(lx + 330, ly - 24, 40, 28, "none", RED, rx=4, dash="6 5", sw=3),
          text(lx + 386, ly, "waited for a rebuild", 26, LIGHT, MONO, 400),
          rect(lx + 760, ly - 24, 40, 28, RED, rx=4), text(lx + 816, ly, "failed", 26, LIGHT, MONO, 400)]
    return frame(f'One edit. {e["rebuilds"]} rebuilds.',
                 f'menu requests per second around the edit · {data["rps"]}/s · build '
                 f'{data["build_orm"]:.0f} ms', "".join(b))


def calendar(data):
    """A month at 1 edit vs 2 edits a day: same code, readers who waited or failed."""
    lo, hi = both(data, "orm", "delete", "paid")
    b = []
    cell, gap, cols = 56, 10, 6

    def month(x0, y0, per_day, color_n):
        out = []
        for d in range(30):
            x, y = x0 + (d % cols) * (cell + gap), y0 + (d // cols) * (cell + gap)
            out.append(rect(x, y, cell, cell, PANEL, GRID, rx=8, sw=2))
            marks = 1 if (per_day == 0 and d == 14) else per_day
            for k in range(marks):
                mx = x + cell / 2 + (k - (marks - 1) / 2) * 22
                out.append(f'<circle cx="{mx:.1f}" cy="{y + cell / 2:.1f}" r="9" fill="{color_n}"/>')
        return out

    gw = cols * (cell + gap) - gap
    xa, xb, y0 = 140, 900, 320
    b += [text(xa, y0 - 30, "1 edit a month", 34, FG, SANS, 800)] + month(xa, y0, 0, RED)
    b += [text(xb, y0 - 30, "2 edits a day", 34, FG, SANS, 800)] + month(xb, y0, 2, RED)
    yb = y0 + 5 * (cell + gap) + 70
    b += [text(xa, yb, span(lo, hi), 52, LIGHT, MONO, 800),
          text(xa, yb + 40, "readers waited or failed", 26, MUTED, MONO, 400),
          text(xb, yb, span(lo * 60, hi * 60), 52, RED, MONO, 800),
          text(xb, yb + 40, "readers waited or failed", 26, MUTED, MONO, 400),
          text(xa + gw + (xb - xa - gw) / 2, y0 + 2.5 * (cell + gap), "→", 72, MUTED, SANS, 400, "middle")]
    return frame("Only the calendar changed.",
                 f'one month · no code change · delete on edit · {data["rps"]} reads/s during each edit', "".join(b))


WAYS = (("delete", "delete the key", "every reader that finds it empty", "cache-aside"),
        ("single_flight", "delete + one rebuilder", "one reader, the rest wait", "single-flight lock"),
        ("swr", "mark the menu old", "a background job", "stale-while-revalidate"),
        ("publish", "write the new menu", "the edit itself", "rebuild on publish"))


def ways(data):
    """Four ways to handle the edit: who rebuilds, and readers who waited or failed per edit."""
    peak = both(data, "orm", "delete", "paid")[1]
    lx, wx, bx, bar_max = 80, 620, 1200, 180
    b = [text(lx, 290, "the edit…", 26, MUTED, MONO, 400),
         text(wx, 290, "who rebuilds", 26, MUTED, MONO, 400),
         text(bx, 290, "waited or failed", 26, MUTED, MONO, 400)]
    for i, (name, edit, who, sub) in enumerate(WAYS):
        y = 320 + i * 120
        lo, hi = both(data, "orm", name, "paid")
        rb_lo, rb_hi = both(data, "orm", name, "rebuilds")
        pays = hi > 0
        color = RED if pays else GREEN
        if i == 2:
            b.append(line(lx, y - 22, W - 80, y - 22, GRID, 2))
        b += [text(lx, y + 34, edit, 36, FG, SANS, 800), text(lx, y + 72, sub, 22, MUTED, MONO, 400),
              text(wx, y + 34, who, 28, FG, SANS, 700),
              text(wx, y + 72, f'{span(rb_lo, rb_hi, "{:g}")} rebuild{"s" if rb_hi > 1 else ""} per edit'
                   + (" · readers get the old menu" if name == "swr" else ""), 22, MUTED, MONO, 400)]
        if pays:
            w = max(bar_max * hi / peak, 14)
            b += [rect(bx, y + 8, w, 44, RED, rx=10), text(bx + w + 16, y + 42, span(lo, hi), 32, color, MONO, 800)]
        else:
            b += [text(bx, y + 42, "0", 40, color, MONO, 800)]
    return frame("Who pays for one edit", f'per edit · {data["rps"]} reads/s · build {data["build_orm"]:.0f} ms · '
                 "2 runs", "".join(b))


def redis_icon(x, y, size, fill="#FF4438"):
    svg = (HERE / "redis.svg").read_text(encoding="utf-8")
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    body = svg[svg.index(">") + 1:svg.rindex("</svg>")]
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}"><g fill="{fill}">{body}</g></svg>'


def badges(x=1560, y=60):
    """Redis and PostgreSQL logos with their names, top right, away from the data."""
    return (redis_icon(x - 170, y + 20, 130) + text(x - 105, y + 200, "Redis", 30, FG, MONO, 800, "middle") +
            tech_icon("postgresql", x + 50, y, 170) + text(x + 135, y + 200, "PostgreSQL", 30, FG, MONO, 800, "middle"))


def cover_page(body):
    cw, ch = 1920, 1080
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{body}{badges()}'
            f'<svg x="120" y="975" width="72" height="72" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(208, 1024, "ARCHEMIST", 30, AMBER, MONO, 800, extra=SPACED)}'
            f'{text(1800, 1024, "archemist.dev", 28, MUTED, MONO, 400, "end")}</svg>')


def cover_a(data):
    """Stakes: the edit, the rebuild count, every connection busy; 41 rebuild bars."""
    n = data["edit"]["rebuilds"]
    b = [text(120, 200, "One menu edit.", 100, FG, SANS, 800),
         text(120, 310, f'<tspan fill="{RED}">{n} rebuilds</tspan> of the same menu.', 80, FG, SANS, 800),
         rect(122, 360, 160, 10, AMBER, rx=5),
         text(120, 440, f'Redis cache · delete on edit → all {data["pool"]} database connections busy', 38, LIGHT,
              MONO, 700)]
    for i in range(n):
        x = 120 + i * 40
        b.append(rect(x, 560, 28, 300, RED, rx=6))
    b.append(text(120, 920, f"each bar = one reader rebuilding the menu · {data['rps']} reads/s", 30, MUTED, MONO, 400))
    return cover_page("".join(b))


def cover_b(data):
    """Big numbers: 41 rebuilds when readers pay, 1 when the edit pays."""
    n = data["edit"]["rebuilds"]
    b = [text(120, 190, "Who pays when your Redis", 84, FG, SANS, 800),
         text(120, 290, "cache goes cold?", 84, FG, SANS, 800),
         rect(122, 330, 160, 10, AMBER, rx=5),
         text(120, 640, str(n), 300, RED, MONO, 800),
         text(130, 720, "rebuilds · readers pay", 38, LIGHT, MONO, 700),
         text(900, 640, "1", 300, GREEN, MONO, 800),
         text(910, 720, "rebuild · the edit pays", 38, LIGHT, MONO, 700),
         text(640, 560, "→", 120, MUTED, SANS, 400, "middle"),
         text(120, 860, "after one menu edit · delete the key vs rebuild on publish", 34, MUTED, MONO, 400)]
    return cover_page("".join(b))


def cover_c(data):
    """The mechanism: an empty cache, readers piling into 20 connection slots, the rest failing."""
    pool = data["pool"]
    b = [text(120, 190, "One edit emptied the cache.", 80, FG, SANS, 800),
         text(120, 290, f'{data["edit"]["rebuilds"]} readers rebuilt the menu.', 80, FG, SANS, 800),
         rect(122, 330, 160, 10, AMBER, rx=5)]
    b += [rect(120, 470, 300, 200, "none", LIGHT, rx=16, dash="14 10", sw=4),
          text(270, 560, "cache", 40, LIGHT, MONO, 800, "middle"), text(270, 610, "empty", 34, RED, MONO, 800, "middle")]
    for k in range(5):
        y = 440 + k * 60
        b.append(arrow(460, y + 20, 720, y + 20, RED, 5))
    b += [text(590, 760, "readers", 30, LIGHT, MONO, 400, "middle")]
    cell, gap = 56, 12
    for i in range(pool):
        x, y = 760 + (i % 5) * (cell + gap), 420 + (i // 5) * (cell + gap)
        b.append(rect(x, y, cell, cell, RED, rx=8))
    b += [text(760, 740, f"{pool} of {pool} database connections busy", 30, LIGHT, MONO, 700)]
    for k in range(4):
        x = 1160 + k * 70
        b += [line(x, 500, x + 40, 540, RED, 6), line(x + 40, 500, x, 540, RED, 6)]
    b += [text(1160, 600, "the rest fail", 34, RED, MONO, 800)]
    return cover_page("".join(b))


DIAGRAMS = {"Cache - 1 Stampede": stampede, "Cache - 2 Calendar": calendar, "Cache - 3 Who Pays": ways,
            "Cache - 1 Stampede Light": light(stampede), "Cache - 2 Calendar Light": light(calendar),
            "Cache - 3 Who Pays Light": light(ways),
            "Cache - Cover A": cover_a, "Cache - Cover B": cover_b, "Cache - Cover C": cover_c}
SIZES = {"Cache - Cover A": (1920, 1080), "Cache - Cover B": (1920, 1080), "Cache - Cover C": (1920, 1080)}

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
