"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad).

Usage: python3 diagrams.py OUT_DIR [RESULTS_LOG] [RUN]
Numbers come from the raw log (default results-ec2-t3small-2026-10-27.txt, run 1).
Needs Google Chrome; fonts load from Google Fonts.
"""
import re
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


def text(x, y, s, size, color=FG, font=SANS, weight=700, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}">{s}</text>')


def rect(x, y, w, h, fill="none", stroke="none", rx=14, dash=None, sw=4):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def line(x1, y1, x2, y2, color, sw=4):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>'


def frame(title, subtitle, body):
    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, W, H, BG, rx=0)}{text(80, 120, title, 72, weight=800)}'
            f'{rect(80, 146, 120, 8, AMBER, rx=4)}{text(80, 210, subtitle, 30, MUTED, MONO, 400)}{body}</svg>')


def parse(log, run):
    """{variant: {"curve": [(rows, rate)], "load_s": .., "pkey_mb": .., ...}} for one run of the log."""
    block = re.split(r"^== run (\d+)$", Path(log).read_text(), flags=re.M)
    runs = dict(zip(block[1::2], block[2::2]))
    out, current = {}, None
    for raw in runs[str(run)].splitlines():
        if m := re.match(r"^== (\w+)$", raw):
            current = out.setdefault(m[1], {"curve": []}) if m[1] != "machine" else None
        elif current is not None and (m := re.match(r"^(\d+),(\d+)$", raw)):
            current["curve"].append((int(m[1]), int(m[2])))
        elif current is not None:
            for key, value in re.findall(r"(\w+) ([\d,.]+)", raw.replace("child (", "child_")):
                current.setdefault(key, float(value.replace(",", "")))
            if raw.startswith("child"):
                current["child_index_mb"] = float(re.search(r"index_mb ([\d,]+)", raw)[1].replace(",", ""))
    return out


def insert_pattern(_):
    """Leaf pages of one B-tree: random keys land anywhere, time-ordered keys at the right edge."""
    b = []
    for row, (label, color, hits) in enumerate((("v4", RED, (0, 2, 3, 4, 6, 7)), ("v7", GREEN, (7,)))):
        y = 330 + row * 280
        b.append(text(80, y + 62, label, 52, color, MONO, 800))
        b.append(rect(530, y - 90, 420, 60, stroke=MUTED, rx=10, sw=3))
        b.append(text(740, y - 50, "root", 30, MUTED, MONO, 700, "middle"))
        for i in range(8):
            x = 260 + i * 135
            hit = i in hits
            b.append(rect(x, y, 110, 90, color if hit else "none", color if hit else GRAY, rx=10, sw=3))
            b.append(line(740, y - 30, x + 55, y, GRID, 2))
        b.append(text(1540, y + 62, "6 pages" if row == 0 else "1 page", 40, color, MONO, 800, "end"))
    b.append(text(260, 820, "leaf pages, oldest → newest", 30, MUTED, MONO, 700))
    return frame("Where the next insert lands", "primary key B-tree · 6 inserts", "".join(b))


V7_EXAMPLE = "01a17e84-e100-71c4-9e2b-5f8a1d3c6e90"  # 2026-10-27 18:00:00 UTC
V4_EXAMPLE = "b42410ee-132f-42ee-9e4f-09a6485c95b8"  # from the PostgreSQL docs


def uuid_string(x, y, value, time_digits):
    """The UUID as text: the time part green, the version digit muted, the rest light."""
    spans, hex_seen = [], 0
    for ch in value:
        if ch == "-":
            color = MUTED
        else:
            color = GREEN if hex_seen < time_digits else (FG if hex_seen == 12 else LIGHT)
            hex_seen += 1
        spans.append(f'<tspan fill="{color}">{ch}</tspan>')
    return f'<text x="{x}" y="{y}" font-family="{MONO}" font-weight="700" font-size="50">{"".join(spans)}</text>'


def bit_layout(_):
    def bar(y, parts):
        out, x = [], 300
        for bits, color, name in parts:
            w = bits / 128 * 1220
            out.append(rect(x, y, w - 4, 76, color, rx=6))
            if w > 120:
                out.append(text(x + w / 2, y + 52, str(bits), 40, BG if color != GRAY else FG, MONO, 800, "middle"))
            if name:
                out.append(text(x + w / 2, y + 120, name, 28, MUTED, MONO, 700, "middle"))
            x += w
        return "".join(out)
    v7 = [(48, GREEN, "time (ms)"), (6, GRAY, ""), (74, LIGHT, "random")]
    v4 = [(122, LIGHT, "random"), (6, GRAY, "")]
    b = (text(80, 330, "v7", 52, GREEN, MONO, 800) + uuid_string(300, 328, V7_EXAMPLE, 12) + bar(360, v7)
         + text(80, 650, "v4", 52, FG, MONO, 800) + uuid_string(300, 648, V4_EXAMPLE, 0) + bar(680, v4)
         + text(1520, 870, "6 bits = version + variant", 28, MUTED, MONO, 700, "end"))
    return frame("Same 128 bits, different order", "UUID layout · RFC 9562", b)


def insert_rate(d):
    x0, y0, w, h = 300, 320, 1000, 440
    maxr = 300_000
    def px(rows):
        return x0 + rows / 10_000_000 * w
    def py(rate):
        return y0 + h - rate / maxr * h
    b = []
    for r in range(0, maxr + 1, 100_000):
        b += [line(x0, py(r), x0 + w, py(r), GRID, 2), text(x0 - 20, py(r) + 10, f"{r // 1000}k", 30, MUTED, MONO, 700, "end")]
    for m in range(0, 11, 2):
        b.append(text(px(m * 1_000_000), y0 + h + 44, f"{m}M", 30, MUTED, MONO, 700, "middle"))
    b += [line(x0, y0 + h, x0 + w, y0 + h, MUTED), line(x0, y0, x0, y0 + h, MUTED),
          text(x0 + w / 2, y0 + h + 96, "rows in the table", 30, MUTED, MONO, 700, "middle"),
          text(x0, y0 - 40, "inserts per second", 30, MUTED, MONO, 700)]
    for name, color, label in (("bigint", GRAY, "bigint"), ("v7", GREEN, "v7"), ("v4", RED, "v4")):
        pts = " ".join(f"{px(rows):.0f},{py(rate):.0f}" for rows, rate in d[name]["curve"])
        b.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="7" stroke-linejoin="round"/>')
        last_rows, last_rate = d[name]["curve"][-1]
        b.append(text(px(last_rows) + 18, py(last_rate) + 12, f"{label} {last_rate / 1000:.0f}k" if last_rate >= 10_000
                      else f"{label} {last_rate / 1000:.1f}k", 34, color, MONO, 800))
    return frame("Random keys fall off a cliff", "10M rows · Postgres in 512 MB", "".join(b))


def levels(d):
    rows = [("bigint", "bigint", GRAY), ("v7", "v7", GREEN), ("v4", "v4", RED),
            ("v4_ff70", "v4 + fillfactor 70", RED), ("bigint_public_v4", "bigint + public v4", RED)]
    maxv = max(d[k]["load_s"] for k, _, _ in rows)
    b, y = [text(560, 268, "seconds to load 10M rows", 30, MUTED, MONO, 700)], 300
    for key, label, color in rows:
        v = d[key]["load_s"]
        w = v / maxv * 780
        b += [text(80, y + 58, label, 40), rect(560, y, w, 80, color), text(560 + w + 24, y + 56, f"{v:,.0f}", 44, FG, MONO, 800)]
        y += 108
    return frame("The cheap fixes don't fix it", "same rows · 5 key choices", "".join(b))


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


def cover(d):
    """1920x1080 newsletter cover: title with the lab number, the insert-rate curve from the log, small logo, footer."""
    cw, ch = 1920, 1080
    brand = text(222, 990, "ARCHEMIST", 32, AMBER, MONO, 800).replace("<text ", '<text letter-spacing="7" ')
    title = (text(120, 330, "Same UUID,", 104, FG, SANS, 800)
             + f'<text x="120" y="456" font-family="{SANS}" font-weight="800" font-size="104" fill="{FG}">'
               f'<tspan font-family="{MONO}" fill="{GREEN}">14x</tspan> faster</text>'
             + text(120, 582, "inserts.", 104, FG, SANS, 800))
    x0, y0, w, h = 960, 250, 660, 520
    maxr = 200_000
    def px(rows):
        return x0 + rows / 10_000_000 * w
    def py(rate):
        return y0 + h - min(rate, maxr) / maxr * h
    chart = [line(x0, y0 + h, x0 + w, y0 + h, MUTED), line(x0, y0, x0, y0 + h, MUTED),
             text(x0, y0 - 30, "inserts per second", 30, MUTED, MONO, 700),
             text(x0 + w, y0 + h + 50, "10M rows", 30, MUTED, MONO, 700, "end")]
    for name, color in (("v7", GREEN), ("v4", RED)):
        pts = [(0, d[name]["curve"][0][1])] + d[name]["curve"]
        chart.append(f'<polyline points="{" ".join(f"{px(r):.0f},{py(v):.0f}" for r, v in pts)}" fill="none" '
                     f'stroke="{color}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>')
    v7_end, v4_end = d["v7"]["curve"][-1][1], d["v4"]["curve"][-1][1]
    bx = x0 + w + 28
    chart += [f'<path d="M{bx - 8},{py(v7_end) + 34} H{bx + 8} V{py(v4_end) - 44} H{bx - 8}" fill="none" stroke="{FG}" stroke-width="4"/>',
              text(bx + 26, (py(v7_end) + py(v4_end)) / 2 + 22, "14x", 64, FG, MONO, 800)]
    chart += [text(x0 + w + 28, py(v7_end) + 14, f"v7 {v7_end / 1000:.0f}k", 40, GREEN, MONO, 800),
              text(x0 + w + 28, py(v4_end) + 14, f"v4 {v4_end / 1000:.1f}k", 40, RED, MONO, 800)]
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{title}{rect(122, 640, 160, 10, AMBER, rx=5)}'
            f'{text(122, 730, "same 16 bytes,", 36, MUTED, MONO, 400)}'
            f'{text(122, 780, "different order", 36, MUTED, MONO, 400)}'
            f'{"".join(chart)}'
            f'<svg x="120" y="935" width="80" height="80" viewBox="0 0 512 512">{LOGO}</svg>{brand}'
            f'{text(1800, 990, "tested on PostgreSQL 18 · archemist.dev", 30, MUTED, MONO, 400, "end")}</svg>')


DIAGRAMS = {"UUID - 1 Insert pattern": insert_pattern, "UUID - 2 Bit layout": bit_layout,
            "UUID - 3 Insert rate": insert_rate, "UUID - 4 Levels": levels, "UUID - Cover": cover}
SIZES = {"UUID - Cover": (1920, 1080)}
if __name__ == "__main__":
    out = Path(sys.argv[1])
    data = parse(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).with_name("results-ec2-t3small-2026-10-27.txt"),
                 sys.argv[3] if len(sys.argv) > 3 else 1)
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
