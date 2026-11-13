"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad,
solid red = silent failure). Usage: python3 diagrams.py OUT_DIR
Numbers come from summary.json (run python3 simulate.py first). Needs Google Chrome; fonts from Google Fonts.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1600, 900
BG, FG, MUTED, GRAY, LIGHT = "#1b1d21", "#f2efe9", "#8a8f98", "#5c6370", "#9aa1ab"
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#d4a017"
PANEL, GRID = "#24272c", "#2c3036"
SANS, MONO = "Inter", "JetBrains Mono"
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


def load():
    return json.loads((HERE / "summary.json").read_text())


ROWS = (("Charge, then call once", "call once"), ("Retry on timeout", "retry"),
        ("Retry + idempotency key", "retry + key"), ("Saga, state in memory", "saga, in memory"),
        ("Saga, durable state", "saga, durable"), ("Order first, then charge", "order first"))


def bars(data, rows, left, top, step, span, label_size, num_size, bar_h):
    """Stacked bar per strategy: paid with no order (red) + duplicate orders (solid red)."""
    top_val = max(data[n]["orphaned_charges"] + data[n]["duplicate_orders"] for n, _ in rows)
    b = []
    for i, (name, label) in enumerate(rows):
        y = top + i * step
        r = data[name]
        o, d = r["orphaned_charges"], r["duplicate_orders"]
        wo, wd = span * o / top_val, span * d / top_val
        b += [text(left - 30, y + bar_h * 0.72, label, label_size, FG, SANS, 800, "end"),
              rect(left, y, span, bar_h, GRID, rx=10)]
        if o:
            b.append(rect(left, y, wo, bar_h, "url(#gRed)", rx=10))
        if d:
            b.append(rect(left + wo + 6, y, wd - 6, bar_h, "url(#hatch)", rx=10))
        if o or d:
            val = f"{o:,}" + (f' <tspan fill="{RED}">+ {d:,}</tspan>' if d else "")
            b.append(text(left + wo + wd + 22, y + bar_h * 0.74, val, num_size, LIGHT, MONO, 800))
        else:
            b.append(text(left + 22, y + bar_h * 0.74, "0", num_size, GREEN, MONO, 800))
    return b


def cover(data):
    """1920x1080: paid with no order and duplicate orders, call once vs retry vs order first."""
    cw, ch = 1920, 1080
    rows = (ROWS[0], ROWS[1], ROWS[5])
    b = [text(120, 190, "Retry after payment:", 96, FG, SANS, 800),
         text(120, 300, f'<tspan fill="{RED}">1,869</tspan> double orders.', 96, FG, SANS, 800),
         rect(122, 340, 160, 10, AMBER, rx=5),
         rect(600, 400, 26, 26, "url(#gRed)", rx=6), text(640, 423, "paid, no order", 30, LIGHT, MONO, 400),
         rect(1000, 400, 26, 26, "url(#hatch)", rx=6), text(1040, 423, "double order", 30, LIGHT, MONO, 400)]
    b += bars(data, rows, 600, 490, 150, 760, 52, 40, 80)
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">{DEFS}'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{"".join(b)}'
            f'<svg x="120" y="975" width="72" height="72" viewBox="0 0 512 512">{LOGO}</svg>'
            f'{text(208, 1024, "ARCHEMIST", 30, AMBER, MONO, 800, extra=SPACED)}'
            f'{text(1800, 1024, "1,000 checkouts a day · one year · archemist.dev", 28, MUTED, MONO, 400, "end")}</svg>')


def holes(data):
    """All six strategies: each fix closes one hole."""
    b = [rect(560, 248, 22, 22, "url(#gRed)", rx=5), text(594, 268, "paid, no order", 26, LIGHT, MONO, 400),
         rect(900, 248, 22, 22, "url(#hatch)", rx=5), text(934, 268, "double order", 26, LIGHT, MONO, 400)]
    b += bars(data, ROWS, 560, 310, 92, 600, 36, 30, 56)
    return frame("Each fix closes one hole.", "a year · 1,000 checkouts a day · assumed fault rates", "".join(b))


def timeout(data):
    """Same timeout, with and without an idempotency key."""
    dup = data["Retry on timeout"]["duplicate_orders"]
    b = []
    for i, (label, keyed) in enumerate((("no key", False), ("same key", True))):
        y = 330 + i * 250
        k = ' key=c42' if keyed else ""
        b += [text(80, y + 62, label, 44, FG, SANS, 800),
              box(360, y, 300, 90, "create" + k, size=30),
              arrow(660, y + 45, 760, y + 45),
              box(760, y, 220, 90, "order #1", PANEL, FG, stroke=LIGHT),
              text(870, y + 132, "reply lost · timeout", 26, MUTED, MONO, 400, "middle"),
              arrow(980, y + 45, 1060, y + 45),
              box(1060, y, 160, 90, "retry", size=30),
              arrow(1220, y + 45, 1300, y + 45)]
        if keyed:
            b.append(box(1300, y, 240, 90, "order #1", "url(#gGreen)", BG))
        else:
            b.append(box(1300, y, 240, 90, "order #2", RED, FG))
    b.append(text(1520, 830, f"{dup:,} double orders a year without a key", 26, RED, MONO, 700, "end"))
    return frame("A timeout is a question.", "the order was created · only the reply was lost", "".join(b))


def order_first(data):
    """Write the order as PENDING, then charge with the same key."""
    b = [box(80, 400, 280, 100, "PENDING", PANEL, AMBER, 40, stroke=AMBER),
         arrow(360, 450, 520, 450), text(440, 425, "key", 26, MUTED, MONO, 400, "middle"),
         box(520, 400, 260, 100, "charge", GRAY, FG, 40),
         arrow(780, 450, 940, 450),
         box(940, 400, 340, 100, "CONFIRMED", "url(#gGreen)", BG, 40),
         arrow(220, 500, 220, 640, LIGHT), box(80, 640, 280, 90, "rejected", PANEL, LIGHT, 34),
         text(220, 780, "nothing taken", 30, GREEN, MONO, 800, "middle"),
         arrow(650, 500, 650, 640, RED, dash="10 8"), text(670, 580, "crash", 28, RED, MONO, 700),
         box(520, 640, 260, 90, "sweeper", PANEL, FG, 34, stroke=LIGHT),
         arrow(780, 685, 1110, 685, LIGHT, dash="10 8"), arrow(1110, 685, 1110, 500, LIGHT, dash="10 8"),
         text(945, 665, "ask provider", 26, MUTED, MONO, 400, "middle"),
         text(1300, 300, "0", 96, GREEN, MONO, 800, "end"),
         text(1310, 300, "refunds", 36, LIGHT, SANS, 700)]
    return frame("Write the order first.", "order first, then charge · same key on both", "".join(b))


DIAGRAMS = {"Saga - Cover": cover, "Saga - 1 Each fix": holes,
            "Saga - 2 Timeout": timeout, "Saga - 3 Order first": order_first}
SIZES = {"Saga - Cover": (1920, 1080)}

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
