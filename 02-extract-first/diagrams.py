"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad).

Usage: python3 diagrams.py OUT_DIR
Needs Google Chrome; fonts load from Google Fonts.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1600, 900
BG, FG, MUTED, GRAY, LIGHT = "#1b1d21", "#f2efe9", "#8a8f98", "#5c6370", "#9aa1ab"
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#d4a017"
SANS, MONO = "Inter", "JetBrains Mono"


def text(x, y, s, size, color=FG, font=SANS, weight=700, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}">{s}</text>')


def rect(x, y, w, h, fill="none", stroke="none", rx=14, dash=None, sw=4):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def arrow(x1, y1, x2, y2, color=MUTED):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="4" '
            f'marker-end="url(#head)"/>')


def frame(title, subtitle, body):
    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">'
            f'<defs><marker id="head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{MUTED}"/></marker></defs>'
            f'{rect(0, 0, W, H, BG, rx=0)}{text(80, 120, title, 72, weight=800)}'
            f'{rect(80, 146, 120, 8, AMBER, rx=4)}{text(80, 210, subtitle, 30, MUTED, MONO, 400)}{body}</svg>')


def bars(rows, top=270, x0=420, maxw=900, maxv=None, step=125, h=84):
    maxv = maxv or max(r[1] for r in rows)
    out, y = [], top
    for name, v, color, tag, parts in rows:
        w = v / maxv * maxw
        out.append(text(80, y + 58, name, 44))
        if parts:  # split bar: [(value, color, label)]
            x = x0
            for pv, pc, pl in parts:
                pw = pv / maxv * maxw
                out.append(rect(x, y, pw, h, pc, rx=0))
                out.append(text(x + pw / 2, y + 56, pl, 30, BG if pc == LIGHT else FG, MONO, 700, "middle"))
                x += pw
        elif color == "dashed":
            out.append(rect(x0, y, w, h, stroke=MUTED, rx=14, dash="14 10"))
        else:
            out.append(rect(x0, y, w, h, color))
        out.append(text(x0 + w + 24, y + 58, f"{v:,}", 44, FG, MONO, 800))
        if tag:
            out.append(text(x0 + w + 24 + len(f"{v:,}") * 27 + 30, y + 58, tag, 36, color if color.startswith("#") else MUTED, MONO, 700))
        y += step
    return "".join(out)




def stamp(x, y, label, color, solid=False, w=240):
    fill = color if solid else "none"
    fg = FG if solid else color
    return rect(x, y, w, 66, fill, color if not solid else "none", rx=10) + text(x + w / 2, y + 46, label, 32, fg, MONO, 800, "middle")


GRID = "#2c3036"


def harrow(x1, x2, y, color, sw=5):
    """Horizontal arrow from x1 to x2 with a head in the same color."""
    d = 1 if x2 > x1 else -1
    return (f'<line x1="{x1}" y1="{y}" x2="{x2 - d * 18}" y2="{y}" stroke="{color}" stroke-width="{sw}"/>'
            f'<path d="M{x2},{y} L{x2 - d * 24},{y - 13} L{x2 - d * 24},{y + 13} z" fill="{color}"/>')


def box(x, y, w, h, label, color=FG):
    return rect(x, y, w, h, stroke=color) + text(x + w / 2, y + h / 2 + 15, label, 42, color, SANS, 700, "middle")


def seams():
    rows = [("orders", 10, RED, True), ("payments", 3, GRAY, True), ("menu", 2, GRAY, True),
            ("notifications", 2, GRAY, False), ("couriers", 3, GREEN, False)]
    b = [text(500, 268, "seams to cut · fewer = easier", 30, MUTED, MONO, 700),
         text(1300, 268, "blocks orders?", 30, MUTED, MONO, 700)]
    y = 300
    for name, n, color, on_path in rows:
        label, scolor = ("YES", RED) if on_path else ("NO", GREEN)
        b += [text(80, y + 58, name, 44), rect(500, y, n * 60, 84, color),
              text(500 + n * 60 + 24, y + 58, str(n), 44, FG, MONO, 800),
              stamp(1300, y + 9, label, scolor, solid=name == "orders", w=200)]
        y += 112
    return frame("Who goes first?", "one typical order · 5 modules", "".join(b))


def growth():
    w_small = 900 * 36.5 / 548
    b = [text(80, 330, "location logs", 44), rect(520, 270, 900, 100, GREEN), text(970, 338, "548M", 52, BG, MONO, 800, "middle"),
         text(80, 500, "order data", 44), rect(520, 440, w_small, 100, GRAY), text(520 + w_small + 24, 508, "36.5M", 52, FG, MONO, 800),
         text(80, 680, "per order", 36, MUTED), text(520, 680, "150 vs 10", 52, FG, MONO, 800),
         text(1420, 680, "15x", 96, GREEN, MONO, 800, "end")]
    return frame("Its own reason to move", "rows per year · 10,000 orders a day", "".join(b))


def matrix():
    x0, y0, w, h = 330, 300, 1150, 470  # plot area
    def px(seams):
        return x0 + seams / 11 * w
    def py(writes):
        return y0 + h - writes / 170 * h
    b = [rect(x0, py(170), px(5) - x0, py(80) - py(170), "#20352a", rx=0),
         text(x0 + 20, py(170) + 44, "EXTRACT FIRST", 30, GREEN, MONO, 800)]
    for s in range(0, 11, 2):  # x ticks
        b += [f'<line x1="{px(s)}" y1="{y0}" x2="{px(s)}" y2="{y0 + h}" stroke="{GRID}" stroke-width="2"/>',
              text(px(s), y0 + h + 44, str(s), 30, MUTED, MONO, 700, "middle")]
    for wr in (0, 50, 100, 150):  # y ticks
        b += [f'<line x1="{x0}" y1="{py(wr)}" x2="{x0 + w}" y2="{py(wr)}" stroke="{GRID}" stroke-width="2"/>',
              text(x0 - 20, py(wr) + 10, str(wr), 30, MUTED, MONO, 700, "end")]
    b += [f'<line x1="{x0}" y1="{y0 + h}" x2="{x0 + w}" y2="{y0 + h}" stroke="{MUTED}" stroke-width="4"/>',
          f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0 + h}" stroke="{MUTED}" stroke-width="4"/>',
          text(x0 + w / 2, y0 + h + 96, "seams to cut →  fewer = easier", 30, MUTED, MONO, 700, "middle"),
          text(80, y0 - 30, "writes per order ↑  own load", 30, MUTED, MONO, 700)]
    # (name, seams, writes, color, label dx, label dy, anchor)
    for name, s, wr, color, dx, dy, anchor in (("couriers · 151", 3, 151, GREEN, 30, 12, "start"),
                                               ("orders", 10, 16, RED, 0, -36, "middle"),
                                               ("payments", 3, 1, RED, 30, -26, "start"),
                                               ("notifications", 2, 5, LIGHT, 0, -52, "middle"),
                                               ("menu", 2, 0, RED, -24, 46, "end")):
        cx, cy = px(s), py(wr)
        b.append(f'<circle cx="{cx}" cy="{cy}" r="15" fill="{color}"/>')
        b.append(text(cx + dx, cy + dy + 12, name, 34, FG, SANS, 700, anchor))
    for lx, color, label in ((880, GREEN, "pick first"), (1110, LIGHT, "safe"), (1250, RED, "blocks orders")):
        b += [f'<circle cx="{lx + 14}" cy="{y0 - 40}" r="14" fill="{color}"/>',
              text(lx + 40, y0 - 30, label, 28, FG, MONO, 700)]
    return frame("Loose, safe, own load", "one typical order · 5 modules", "".join(b))


def copy_once():
    b = [text(80, 300, "ask every refresh", 34, RED, MONO, 800),
         box(80, 330, 300, 120, "couriers"), box(900, 330, 300, 120, "orders")]
    for y in (350, 375, 400, 425):
        b.append(harrow(400, 880, y, RED, 4))
    b += [text(640, 320, "ETA refresh × 50", 30, MUTED, MONO, 700, "middle"),
          text(1300, 420, "53", 110, RED, MONO, 800), text(1300, 465, "calls", 30, MUTED, MONO, 700),
          f'<line x1="80" y1="525" x2="1520" y2="525" stroke="{GRID}" stroke-width="3"/>',
          text(80, 590, "copy once", 34, GREEN, MONO, 800),
          rect(80, 620, 300, 150, stroke=FG), text(230, 675, "couriers", 42, FG, SANS, 700, "middle"),
          rect(130, 700, 200, 50, "#20352a", GREEN, rx=10, sw=3), text(230, 736, "address", 30, GREEN, MONO, 700, "middle"),
          box(900, 635, 300, 120, "orders"),
          harrow(880, 400, 695, GREEN),
          text(640, 672, "at assignment × 1", 30, MUTED, MONO, 700, "middle"),
          text(80, 820, "ETA reads its own copy", 30, MUTED, MONO, 700),
          text(1300, 725, "4", 110, GREEN, MONO, 800), text(1300, 770, "calls", 30, MUTED, MONO, 700)]
    return frame("Copy the address once", "couriers → orders, per order", "".join(b))


DIAGRAMS = {"Extract - 1 Seams": seams, "Extract - 2 Growth": growth,
            "Extract - 3 Matrix": matrix, "Extract - 4 Copy once": copy_once}
if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    fonts = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800'
             '&family=JetBrains+Mono:wght@400;700;800&display=block" rel="stylesheet">')
    with tempfile.TemporaryDirectory() as tmp:
        for name, fn in DIAGRAMS.items():
            page = Path(tmp) / "d.html"
            page.write_text(f'<!doctype html><html><head><meta charset="utf-8">{fonts}'
                            f'<style>html,body{{margin:0;background:{BG}}}</style></head><body>{fn()}</body></html>')
            subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--window-size={W},{H}",
                            "--force-device-scale-factor=2", "--virtual-time-budget=8000",
                            f"--screenshot={out / (name + '.png')}", page.as_uri()],
                           check=True, capture_output=True)
            print(out / f"{name}.png")
