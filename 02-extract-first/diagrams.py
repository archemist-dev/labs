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


def seams():
    rows = [("orders", 10, RED, True), ("payments", 3, GRAY, True), ("menu", 2, GRAY, True),
            ("notifications", 2, GRAY, True), ("couriers", 3, GREEN, False)]
    b = [text(500, 262, "seams to cut", 30, MUTED, MONO, 700), text(1250, 262, "order path", 30, MUTED, MONO, 700)]
    y = 300
    for name, n, color, on_path in rows:
        label, scolor = ("IF SYNC", LIGHT) if name == "notifications" else (("BLOCKS", RED) if on_path else ("SAFE", GREEN))
        b += [text(80, y + 58, name, 44), rect(500, y, n * 60, 84, color),
              text(500 + n * 60 + 24, y + 58, str(n), 44, FG, MONO, 800),
              stamp(1250, y + 9, label, scolor, solid=name == "orders")]
        y += 112
    return frame("Who goes first?", "one typical order · 5 modules", "".join(b))


def growth():
    b = [text(80, 330, "position rows", 44), rect(520, 270, 900, 100, GREEN), text(970, 338, "548M", 52, BG, MONO, 800, "middle"),
         text(80, 500, "order rows", 44), rect(520, 440, 900 * 36.5 / 548, 100, GRAY), text(520 + 900 * 36.5 / 548 + 24, 508, "36.5M", 52, FG, MONO, 800),
         text(80, 680, "per order", 36, MUTED), text(520, 680, "150 vs 10", 52, FG, MONO, 800),
         text(1420, 680, "15x", 96, GREEN, MONO, 800, "end")]
    return frame("Its own reason to move", "rows per year · 10,000 orders/day", "".join(b))


def matrix():
    x0, y0, w, h = 420, 270, 1060, 500  # plot area
    def px(seams):
        return x0 + seams / 11 * w
    def py(writes):
        return y0 + h - writes / 160 * h
    b = [rect(x0, y0, w / 2, h / 2, "#20352a", rx=0), text(x0 + 24, y0 + 50, "EXTRACT FIRST", 30, GREEN, MONO, 800),
         f'<line x1="{x0}" y1="{y0 + h}" x2="{x0 + w}" y2="{y0 + h}" stroke="{MUTED}" stroke-width="4"/>',
         f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0 + h}" stroke="{MUTED}" stroke-width="4"/>',
         text(x0 + w, y0 + h + 60, "seams to cut →", 32, MUTED, MONO, 700, "end"),
         text(80, y0 + 40, "writes", 32, MUTED, MONO, 700), text(80, y0 + 80, "per order", 32, MUTED, MONO, 700)]
    # (name, seams, writes, color, label dx, label dy, anchor)
    for name, s, wr, color, dx, dy, anchor in (("couriers", 3, 151, GREEN, 34, 0, "start"),
                                               ("orders", 10, 16, RED, -34, -30, "end"),
                                               ("payments", 3, 1, RED, 34, -40, "start"),
                                               ("notifications", 2, 5, LIGHT, 0, -56, "middle"),
                                               ("menu", 2, 0, RED, -34, 30, "end")):
        cx, cy = px(s), py(wr)
        b.append(f'<circle cx="{cx}" cy="{cy}" r="20" fill="{color}"/>')
        b.append(text(cx + dx, cy + dy + 14, name, 36, FG, SANS, 700, anchor))
    b.append(text(x0 + w, y0 + 40, "red = blocks orders", 28, RED, MONO, 700, "end"))
    b.append(text(x0 + w, y0 + 84, "gray = only if sync", 28, LIGHT, MONO, 700, "end"))
    return frame("Loose, safe, own load", "seams vs writes · one typical order", "".join(b))


def variants():
    rows = [("copy once", 4, GREEN, "", None), ("ask every refresh", 53, RED, "", None), ("read its table", 53, RED, "", None)]
    return frame("How couriers gets the address", "calls + reads into orders, per order", bars(rows, top=300, x0=560, maxw=760, step=150))


DIAGRAMS = {"Extract - 1 Seams": seams, "Extract - 2 Growth": growth,
            "Extract - 3 Matrix": matrix, "Extract - 4 Copy once": variants}
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
