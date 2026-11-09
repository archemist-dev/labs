"""Render the article diagrams as PNG (Archemist style: charcoal, big type, green = win, red = bad).

Usage: python3 diagrams.py OUT_DIR
Numbers come from the grade files in runs/ (rules written down) and runs-unwritten/ (rules not written down),
and the review costs saved next to them. Needs Google Chrome; fonts load from Google Fonts.
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
SANS, MONO = "Inter", "JetBrains Mono"
GRID = "#2c3036"


def text(x, y, s, size, color=FG, font=SANS, weight=700, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}">{s}</text>')


def rect(x, y, w, h, fill="none", stroke="none", rx=14, dash=None, sw=4):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def line(x1, y1, x2, y2, color, sw=4, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"{d}/>'


def polyline(pts, color, sw=7, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<polyline points="{" ".join(f"{x:.0f},{y:.0f}" for x, y in pts)}" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{d}/>')


def frame(title, subtitle, body):
    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, W, H, BG, rx=0)}{text(80, 120, title, 72, weight=800)}'
            f'{rect(80, 146, 120, 8, AMBER, rx=4)}{text(80, 210, subtitle, 30, MUTED, MONO, 400)}{body}</svg>')


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

BUGS = [("b01-chain-from-view", "stale view decides"), ("b02-http-retry", "retry repeats refunds"),
        ("b03-promo-on-total", "promo on delivery"), ("b04-summary-utc-day", "UTC day, not London"),
        ("b05-notify-returns-status", "False instead of raise"), ("b06-card-expired", "new exception type"),
        ("b07-zone-defaults", "default None → 0"), ("b08-flag-rename", "flag renamed once"),
        ("b09-pickup-time-lost", "written to a copy"), ("b10-spread-units", "km vs metres")]


def load():
    def grades(base, reviewer, pr):
        return [json.loads(f.read_text()) for f in sorted((HERE / base / reviewer / pr).glob("run*.grade.json"))]

    def cost(base, reviewer):
        c = [json.loads(f.read_text())["cost_usd"] for f in (HERE / base / reviewer).glob("*/run[0-9].json")]
        return sum(c) / len(c)

    def comments(reviewer, blocking=False):
        gs = [json.loads(f.read_text()) for f in (HERE / "runs" / reviewer).glob("*/run*.grade.json")]
        return sum(g["blocking" if blocking else "comments"] for g in gs) / len(gs)

    data = {"bugs": []}
    for pr, label in BUGS:
        w, u = grades("runs", "default", pr), grades("runs-unwritten", "default", pr)
        data["bugs"].append({"label": label, "written": (sum(g["caught"] for g in w), len(w)),
                             "unwritten": (sum(g["caught"] for g in u), len(u))})
    data["comments"] = {"default": comments("default"), "checklist": comments("checklist"),
                        "blocking": comments("checklist", blocking=True)}
    data["cost"] = {"default": cost("runs", "default"), "checklist": cost("runs", "checklist")}
    return data


def cell(x, y, caught, n):
    return (rect(x, y, 300, 150, GREEN if caught == n else RED, rx=14)
            + text(x + 150, y + 98, f"{caught} of {n}", 64, BG, MONO, 800, "middle"))


def written_vs_not(data):
    """The 10 bugs in two groups: the rule shows in the code itself, or it lives only in a comment. Comment kept vs deleted."""
    def caught_all(bug, key):
        return bug[key][0] == bug[key][1]
    only_comment = [bug for bug in data["bugs"] if not caught_all(bug, "unwritten")]
    in_code = [bug for bug in data["bugs"] if caught_all(bug, "unwritten")]
    b = [text(990, 300, "comment kept", 36, LIGHT, SANS, 700, "middle"),
         text(1370, 300, "comment deleted", 36, LIGHT, SANS, 700, "middle")]
    for y, label, sub, group in ((340, "rule shows in the code", f"{len(in_code)} bugs · e.g. km vs metres", in_code),
                                 (530, "rule only in a comment", f"{len(only_comment)} bugs · promo, stale copy", only_comment)):
        b.append(text(80, y + 72, label, 44, FG, SANS, 800))
        b.append(text(80, y + 124, sub, 30, MUTED, MONO, 400))
        b.append(cell(840, y, sum(caught_all(g, "written") for g in group), len(group)))
        b.append(cell(1220, y, sum(caught_all(g, "unwritten") for g in group), len(group)))
    b.append(text(80, 800, "caught = a blocking comment names the bug", 28, MUTED, MONO, 400))
    b.append(text(80, 845, "kept: 3 runs each · deleted: 1 run, 3 for the misses", 28, MUTED, MONO, 400))
    return frame("Delete the comments: 8 of 10 caught.", "10 silent bugs · same AI reviewer · same code", "".join(b))


def chip(x, y, s, fill, stroke="none", dash=None, color=BG):
    return rect(x, y - 46, 90, 64, fill, stroke, rx=10, dash=dash) + text(x + 45, y - 2, s, 34, color, MONO, 800, "middle")


def story(data):
    """The story's bug: an order just moved to another courier, the screen copy still shows the old courier, the new order follows the copy."""
    b = [text(80, 330, "real data", 44, FG, SANS, 800),
         text(560, 330, "courier_9", 40, LIGHT, MONO, 700), chip(820, 330, "A", GRAY),
         text(1520, 330, "now", 30, MUTED, MONO, 400, "end"),
         text(80, 450, "screen copy", 44, FG, SANS, 800),
         text(560, 450, "courier_7", 40, LIGHT, MONO, 700), chip(820, 450, "A", "none", GRAY, "10 8", LIGHT),
         text(1520, 450, "seconds behind", 30, MUTED, MONO, 400, "end"),
         line(80, 530, 1520, 530, GRID, 3),
         chip(80, 630, "N", FG), text(200, 630, "new order, next to A", 40, LIGHT, SANS, 700),
         text(80, 750, "went to", 40, LIGHT, SANS, 700), rect(400, 700, 280, 68, RED, rx=10),
         text(540, 746, "courier_7", 36, BG, MONO, 800, "middle"), text(720, 746, "read from the copy", 30, MUTED, MONO, 400),
         text(80, 850, "should go to", 40, LIGHT, SANS, 700), rect(400, 800, 280, 68, GREEN, rx=10),
         text(540, 846, "courier_9", 36, BG, MONO, 800, "middle"), text(720, 846, "real data", 30, MUTED, MONO, 400)]
    return frame("The copy was seconds behind.", "order A just moved from courier_7 to courier_9 · no error", "".join(b))


def noise(data):
    """What each reviewer posts per PR, and what it costs: same 10 of 10 caught."""
    c, k = data["comments"], data["cost"]
    rows = ((330, "default prompt", c["default"], k["default"], GRAY), (530, "checklist prompt", c["checklist"], k["checklist"], GREEN),
            (730, "checklist, blocking only", c["blocking"], k["checklist"], GREEN))
    b = []
    scale = 900 / 6
    for y, name, n, usd, color in rows:
        b.append(text(80, y, name, 36, LIGHT, SANS, 700))
        b.append(rect(80, y + 24, n * scale, 70, color, rx=10))
        b.append(text(100 + n * scale, y + 72, f"{n:.1f}", 40, FG, MONO, 800))
        b.append(text(1520, y + 72, f"${usd:.3f}", 40, FG, MONO, 800, "end"))
    b.append(text(1520, 290, "per PR", 30, MUTED, MONO, 400, "end"))
    return frame("Same catches. Less noise.", "comments per PR · all 10 bugs caught by each", "".join(b))


def cover(data):
    """1920x1080 newsletter cover: the promo bug's code with and without the rule comment, and the reviewer's verdict on each."""
    cw, ch = 1920, 1080
    promo = next(bug for bug in data["bugs"] if bug["label"] == "promo on delivery")
    brand = text(222, 1000, "ARCHEMIST", 32, AMBER, MONO, 800).replace("<text ", '<text letter-spacing="7" ')
    code = "discount = 10% of (items + delivery)"

    def card(y, comment):
        top = (text(160, y + 82, "# promo: item subtotal only", 40, LIGHT, MONO, 400) if comment
               else rect(150, y + 36, 640, 64, "none", GRAY, rx=8, dash="10 8")
               + text(470, y + 80, "comment deleted", 32, MUTED, MONO, 400, "middle"))
        return rect(120, y, 1000, 210, "#24272c", rx=16) + top + text(160, y + 162, code, 40, FG, MONO, 700)

    def verdict(y, ok, big, small):
        return (rect(1180, y + 40, 620, 84, GREEN if ok else RED, rx=12)
                + text(1490, y + 98, big, 46, BG, MONO, 800, "middle")
                + text(1490, y + 176, small, 34, MUTED, MONO, 400, "middle"))

    w, u = promo["written"], promo["unwritten"]
    body = (card(330, True) + verdict(330, True, f"blocked {w[0]} of {w[1]}", "AI: \u201cbreaks the written terms\u201d")
            + card(610, False) + verdict(610, False, f"missed {u[1] - u[0]} of {u[1]}", "AI: \u201ca business decision\u201d"))
    return (f'<svg viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}" xmlns="http://www.w3.org/2000/svg">'
            f'{rect(0, 0, cw, ch, BG, rx=0)}{text(120, 190, "Same bug. Same AI reviewer.", 96, FG, SANS, 800)}'
            f'{rect(122, 230, 160, 10, AMBER, rx=5)}{body}'
            f'<svg x="120" y="945" width="80" height="80" viewBox="0 0 512 512">{LOGO}</svg>{brand}'
            f'{text(1800, 1000, "Claude Code review, 3 runs each · archemist.dev", 30, MUTED, MONO, 400, "end")}</svg>')


DIAGRAMS = {"Reviewer - 1 Written vs not": written_vs_not, "Reviewer - 2 Stale view": story,
            "Reviewer - 3 Noise": noise, "Reviewer - Cover": cover}
SIZES = {"Reviewer - Cover": (1920, 1080)}
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
