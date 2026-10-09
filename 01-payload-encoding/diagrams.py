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
GREEN, RED, AMBER = "#34c77b", "#e5484d", "#f5a623"
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


def size():
    rows = [("JSON", 1076, GRAY, "", [(461, LIGHT, "field names 461"), (615, GRAY, "values")]),
            ("Protobuf", 470, GREEN, "", None),
            ("Avro", 417, GREEN, "", None),
            ("JSON + gzip", 516, "dashed", "", None)]
    return frame("Same order, 3 encodings", "bytes · typical order, 3 items", bars(rows))


def scale():
    b = [rect(80, 380, 360, 170, stroke=FG), text(260, 455, "606 B", 52, FG, MONO, 800, "middle"),
         text(260, 510, "per request", 32, MUTED, SANS, 600, "middle")]
    for i, (rps, cost, note) in enumerate([("× 1,000 RPS", "$377 / year", "team dinner"),
                                          ("× 10,000 RPS", "$3,770 / year", "team trip")]):
        y = 290 + i * 300
        b += [arrow(450, 465, 780, y + 85), text(600, y + 40 if i == 0 else y + 150, rps, 36, FG, MONO, 700, "middle"),
              rect(800, y, 480, 170, stroke=GREEN), text(1040, y + 105, cost, 52, GREEN, MONO, 800, "middle"),
              text(1310, y + 100, note, 36, MUTED, SANS, 600)]
    return frame("606 bytes saved per request", "JSON → Protobuf · cross-AZ · AWS", "".join(b))


def schema():
    def stamp(x, y, label):
        if label == "SILENT":
            return rect(x, y, 210, 66, RED, rx=10) + text(x + 105, y + 46, label, 34, FG, MONO, 800, "middle")
        color = GREEN if label == "OK" else RED
        return rect(x, y, 210, 66, stroke=color, rx=10) + text(x + 105, y + 46, label, 34, color, MONO, 800, "middle")
    b = [rect(80, 250, 380, 170, stroke=FG), text(270, 310, "v1", 36, MUTED, MONO, 700, "middle"),
         text(270, 365, "order_id · notes", 34, FG, MONO, 700, "middle"),
         rect(1140, 250, 380, 170, stroke=FG), text(1330, 310, "v2", 36, MUTED, MONO, 700, "middle"),
         text(1330, 365, "order_id · tip", 34, FG, MONO, 700, "middle"),
         arrow(480, 305, 1120, 305), text(800, 285, "v1 data → v2 reader", 28, MUTED, MONO, 400, "middle"),
         arrow(1120, 370, 480, 370), text(800, 410, "v2 data → v1 reader", 28, MUTED, MONO, 400, "middle")]
    for x, h in ((470, "v1 → v2"), (720, "v2 → v1"), (1000, "trap")):
        b.append(text(x, 500, h, 30, MUTED, MONO, 700))
    y = 540
    for name, a, c, trap, t in (("JSON", "FAIL", "FAIL", "strict d[key]", None),
                                ("Protobuf", "OK", "OK", "reused #8", "SILENT"),
                                ("Avro", "OK", "FAIL", "wrong schema", "SILENT")):
        b += [text(80, y + 48, name, 44), stamp(470, y, a), stamp(720, y, c), text(1000, y + 46, trap, 32, LIGHT, MONO, 400)]
        if t:
            b.append(stamp(1300, y, t))
        y += 110
    return frame("Schema change", "remove notes · add tip", "".join(b))


def levels():
    rows = [("Untrimmed", 2672, GRAY, "", None), ("Trim fields", 1076, GREEN, "-60%", None),
            ("Compact", 989, GREEN, "-63%", None), ("Gzip", 510, GREEN, "-81%", None),
            ("Protobuf", 470, GREEN, "-82% · migration", None)]
    return frame("Cheapest fix first", "bytes per order", bars(rows, top=250, step=120))


DIAGRAMS = {"Payload - 1 Size": size, "Payload - 2 Scale": scale,
            "Payload - 3 Schema change": schema, "Payload - 4 Levels": levels}

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
