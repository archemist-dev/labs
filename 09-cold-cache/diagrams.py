"""Render the article diagrams and cover options as PNG (Archemist style: charcoal, big type, green = win,
gray = neutral, red = bad). Usage: python3 diagrams.py OUT_DIR
Numbers come from the summaries of the reference runs (summary-*.json). Needs Google Chrome; fonts from Google Fonts.
Helpers and light() are copied from 08-table-bloat/diagrams.py so every week matches.
Icons: Lucide (icons/, ISC license); one-color Redis and PostgreSQL logos from Simple Icons.
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


def icon(name, x, y, size, color=LIGHT, sw=2):
    """A Lucide icon (icons/<name>.svg, ISC license) drawn as strokes in the given color."""
    svg = (HERE / "icons" / f"{name}.svg").read_text(encoding="utf-8")
    body = svg[svg.index(">", svg.index("<svg")) + 1:svg.rindex("</svg>")]
    return (f'<svg x="{x:.1f}" y="{y:.1f}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')


def logo(name, x, y, size, color=LIGHT):
    """A one-color tech logo (Simple Icons path: redis.svg, postgresql-mono.svg) in a palette color."""
    svg = (HERE / f"{name}.svg").read_text(encoding="utf-8")
    body = svg[svg.index(">", svg.index("<svg")) + 1:svg.rindex("</svg>")]
    return (f'<svg x="{x:.1f}" y="{y:.1f}" width="{size}" height="{size}" viewBox="0 0 24 24">'
            f'<g fill="{color}">{body}</g></svg>')


def person(x, y, size, color):
    """A reader: a filled head and shoulders, readable at small sizes."""
    return (f'<svg x="{x:.1f}" y="{y:.1f}" width="{size}" height="{size}" viewBox="0 0 24 24">'
            f'<circle cx="12" cy="7.5" r="4.5" fill="{color}"/>'
            f'<path d="M3.5 22c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5z" fill="{color}"/></svg>')


def card(x, y, w, h, stroke=GRID, dash=None, fill=PANEL, sw=3):
    return rect(x, y, w, h, fill, stroke, rx=22, dash=dash, sw=sw)


def stampede(data):
    """One edit as a chain of cards, then what it cost: wait, failures, time until the menu is back."""
    e = data["edit"]
    f_lo, f_hi = both(data, "orm", "delete", "failed")
    c_lo, c_hi = both(data, "orm", "delete", "cold_window_s")
    pool = data["pool"]
    y, h, cy = 270, 240, 390
    b = []
    # 1. the edit
    b += [card(80, y, 250, h), icon("pencil", 80 + 125 - 38, y + 44, 76, FG),
          text(205, y + 178, "menu edited", 34, FG, SANS, 800, "middle"),
          text(205, y + h + 38, "one price", 22, MUTED, MONO, 400, "middle"),
          arrow(342, cy, 391, cy, LIGHT)]
    # 2. the cache, now empty
    b += [card(403, y, 250, h, RED, "14 10", "none", 4), logo("redis", 403 + 125 - 36, y + 46, 72, LIGHT),
          text(528, y + 178, 'cache <tspan fill="' + RED + '">empty</tspan>', 34, FG, SANS, 800, "middle"),
          text(528, y + h + 38, "the key was deleted", 22, MUTED, MONO, 400, "middle"),
          arrow(665, cy, 714, cy, RED)]
    # 3. the readers who rebuild: one person each
    x3, w3 = 726, 420
    b += [card(x3, y, w3, h, RED), text(x3 + w3 / 2, y + 56, f'{e["rebuilds"]} readers', 40, RED, MONO, 800, "middle")]
    cols, size, gap = 11, 30, 6
    gx = x3 + (w3 - (cols * (size + gap) - gap)) / 2
    for k in range(e["rebuilds"]):
        b.append(person(gx + (k % cols) * (size + gap), y + 82 + (k // cols) * (size + 6), size, RED))
    b += [text(x3 + w3 / 2, y + h + 38, "each builds the same menu", 22, MUTED, MONO, 400, "middle"),
          arrow(x3 + w3 + 12, cy, 1207, cy, RED)]
    # 4. the database: every connection taken
    x4, w4 = 1219, 301
    b += [card(x4, y, w4, h, RED), logo("postgresql-mono", x4 + 28, y + 24, 48, LIGHT),
          text(x4 + 92, y + 60, "database", 30, FG, SANS, 800)]
    cell, gap = 28, 10
    gx = x4 + (w4 - (5 * (cell + gap) - gap)) / 2
    for k in range(pool):
        b.append(rect(gx + (k % 5) * (cell + gap), y + 88 + (k // 5) * (cell + 6), cell, cell, RED, rx=6))
    b += [text(x4 + w4 / 2, y + h + 38, f"{pool} of {pool} connections busy", 20, MUTED, MONO, 400, "middle")]
    # what it cost: three tiles
    ty, th, tw, tg = 610, 170, 460, 30
    tiles = (("hourglass", LIGHT, "5 s", FG, "everyone else waits"),
             ("circle-x", RED, f"{span(f_lo, f_hi)}", RED, "readers failed"),
             ("timer", LIGHT, f"{span(c_lo, c_hi, '{:.1f}')} s", FG, "until the menu is back"))
    for k, (ic, ic_color, big, color, cap) in enumerate(tiles):
        x = 80 + k * (tw + tg)
        b += [card(x, ty, tw, th), icon(ic, x + 34, ty + 49, 72, ic_color),
              text(x + 134, ty + 86, big, 46, color, MONO, 800), text(x + 134, ty + 126, cap, 22, MUTED, MONO, 400)]
    return frame("Ten seconds after one edit", f'delete on edit · {data["rps"]} reads/s · build {data["build_orm"]:.0f} ms'
                 " · median edit", "".join(b))


def calendar(data):
    """A month of days with its edits, and the readers hit, at 1 edit a month vs 2 edits a day."""
    lo, hi = both(data, "orm", "delete", "paid")
    x0, cell, gap = 84, 40, 8
    full = 30 * (cell + gap) - gap
    b = [text(x0 + full, 300, "30 days · dot = one edit", 22, MUTED, MONO, 400, "end")]
    for i, (label, per_day, n) in enumerate((("1 edit a month", 0, 1), ("2 edits a day", 2, 60))):
        y = 262 + i * 250
        big = n > 1
        b += [icon("calendar", x0, y + 4, 44, FG), text(x0 + 60, y + 40, label, 40, FG, SANS, 800)]
        for d in range(30):
            x = x0 + d * (cell + gap)
            b.append(rect(x, y + 64, cell, cell, PANEL, GRID, rx=8, sw=2))
            marks = per_day if big else (1 if d == 14 else 0)
            for k in range(marks):
                cx = x + cell / 2 + (k - (marks - 1) / 2) * 16
                b.append(f'<circle cx="{cx:.1f}" cy="{y + 64 + cell / 2:.1f}" r="6" fill="{RED}"/>')
        w = max(full * n / 60, 16)
        b.append(rect(x0, y + 124, w, 60, RED if big else GRAY, rx=12))
        if big:
            b += [text(x0 + 24, y + 168, span(lo * n, hi * n), 40, BG, MONO, 800),
                  text(x0 + 420, y + 166, "readers waited or failed", 24, BG, MONO, 700)]
        else:
            b += [text(x0 + w + 20, y + 168, span(lo, hi), 40, LIGHT, MONO, 800),
                  text(x0 + w + 220, y + 166, "readers waited or failed", 24, MUTED, MONO, 400)]
    b.append(text(x0 + full, 770, "same code · 60× the edits · 60× the readers", 26, LIGHT, MONO, 700, "end"))
    return frame("Only the calendar changed.",
                 f'one month · delete on edit · build {data["build_orm"]:.0f} ms · {data["rps"]} reads/s during each edit',
                 "".join(b))


WAYS = (("delete", "delete the key", "cache-aside"),
        ("single_flight", "delete + one rebuilder", "single-flight"),
        ("swr", "mark the menu old", "stale-while-revalidate"),
        ("publish", "write the new menu", "rebuild on publish"))


def ways(data):
    """Four ways as cards: who goes to the database after an edit, and what it costs the readers."""
    fx, ax, rx = 540, 890, 1236
    b = [text(116, 256, "the edit…", 20, MUTED, MONO, 400), text(fx, 256, "who builds the new menu", 20, MUTED, MONO, 400),
         text(rx, 256, "readers", 20, MUTED, MONO, 400)]
    for i, (name, label, sub) in enumerate(WAYS):
        y = 272 + i * 130
        cy = y + 59
        lo, hi = both(data, "orm", name, "paid")
        rb = both(data, "orm", name, "rebuilds")
        pays = hi > 0
        accent = RED if pays else GREEN
        b += [card(80, y, 1440, 118), rect(80, y + 16, 8, 86, accent, rx=4),
              text(116, y + 54, label, 32, FG, SANS, 800), text(116, y + 88, sub, 20, MUTED, MONO, 400)]
        # who builds
        if name == "delete":
            for k in range(8):
                b.append(person(fx - 4 + (k % 4) * 32, y + 22 + (k // 4) * 40, 30, RED))
            b += [text(fx + 140, y + 52, f"{span(*rb, '{:g}')} readers", 24, RED, MONO, 800),
                  text(fx + 140, y + 86, "each builds it", 20, MUTED, MONO, 400)]
            for k in (-16, 0, 16):
                b.append(arrow(ax, cy + k, ax + 100, cy + k, RED, 3))
        else:
            who = {"single_flight": ("person", "1 reader"), "swr": ("cog", "background job"),
                   "publish": ("pencil", "the edit")}[name]
            b.append(person(fx, y + 31, 56, FG) if who[0] == "person" else icon(who[0], fx + 2, y + 33, 52, FG))
            b.append(text(fx + 76, y + 52, who[1], 24, FG, MONO, 800))
            if name == "single_flight":
                b += [icon("clock", fx + 76, y + 68, 22, RED), text(fx + 106, y + 86, "the rest wait", 20, RED, MONO, 700)]
            elif name == "swr":
                b += [icon("file-text", fx + 76, y + 68, 22, MUTED),
                      text(fx + 106, y + 86, "readers: old menu", 20, MUTED, MONO, 400)]
            else:
                b.append(text(fx + 76, y + 86, "then fills the cache", 20, MUTED, MONO, 400))
            b.append(arrow(ax, cy, ax + 100, cy, LIGHT, 3))
        b.append(logo("postgresql-mono", ax + 116, cy - 24, 48, RED if name == "delete" else LIGHT))
        if name == "publish":
            b += [arrow(ax + 176, cy, ax + 212, cy, LIGHT, 3), logo("redis", ax + 224, cy - 22, 44, LIGHT)]
        # what readers pay
        if pays:
            b += [icon("circle-x" if name == "delete" else "clock", rx, y + 35, 48, RED),
                  text(rx + 64, y + 62, span(lo, hi), 42, RED, MONO, 800),
                  text(rx + 64, y + 94, "waited or failed" if name == "delete" else "waited", 20, MUTED, MONO, 400)]
        else:
            b += [icon("circle-check", rx, y + 35, 48, GREEN), text(rx + 64, y + 62, "0", 42, GREEN, MONO, 800),
                  text(rx + 64, y + 94, "waited", 20, MUTED, MONO, 400)]
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
            "Cache - Cover": cover_a, "Cache - Cover Light": light(cover_a)}
SIZES = {"Cache - Cover": (1920, 1080), "Cache - Cover Light": (1920, 1080)}
# Cover options B (big numbers) and C (mechanism) were offered with A; Javlon picked A on 2026-11-25.
# Render them again with: COVERS=all python3 diagrams.py OUT_DIR
if os.environ.get("COVERS") == "all":
    DIAGRAMS.update({"Cache - Cover B": cover_b, "Cache - Cover C": cover_c})
    SIZES.update({"Cache - Cover B": (1920, 1080), "Cache - Cover C": (1920, 1080)})

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
