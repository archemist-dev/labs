"""Map a YouTube Studio audience-retention export onto a rendered Short.

Usage (from labs/shorts):
    python -I tools/retention.py <retention.csv> <id> [--length SECONDS]

<retention.csv>  the "Все.csv" (or any) export: columns "Video position (%)" and
                 "Absolute audience retention (%)"; extra columns are ignored.
<id>             the Short's id, e.g. 01-short2-en: reads public/transcripts/<id>.json
                 and the length from out/<id>.mp4 (or pass --length).

Prints average viewed, retention at fixed seconds, the sample size and the steepest
drops with the words spoken at that moment. Standard library only.
"""
import csv
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECONDS = (3, 6, 9, 12, 15, 20, 30, 40, 50, 60, 70, 80)


def mp4_length(path: Path) -> float:
    data = path.read_bytes()
    i = data.find(b"mvhd")
    if i < 0:
        raise SystemExit(f"no mvhd box in {path}")
    if data[i + 4] == 0:
        scale, dur = struct.unpack(">II", data[i + 16:i + 24])
    else:
        scale, dur = struct.unpack(">IQ", data[i + 24:i + 36])
    return dur / scale


def read_curve(path: Path) -> list[float]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    head = rows[0]
    col = next(i for i, h in enumerate(head) if h.startswith("Absolute audience retention"))
    curve = [float(r[col]) for r in rows[1:] if r and r[col]]
    if len(curve) != 100:
        raise SystemExit(f"expected 100 points, got {len(curve)} (use the overall export, not a split one)")
    return curve


def main() -> None:
    args = sys.argv[1:]
    length = None
    if "--length" in args:
        k = args.index("--length")
        length = float(args[k + 1])
        del args[k:k + 2]
    if len(args) != 2:
        raise SystemExit(__doc__)
    csv_path, sid = Path(args[0]), args[1]

    curve = read_curve(csv_path)
    if length is None:
        mp4 = ROOT / "out" / f"{sid}.mp4"
        if not mp4.exists():
            raise SystemExit(f"{mp4} not found; pass --length SECONDS")
        length = mp4_length(mp4)
    tr = json.loads((ROOT / "public" / "transcripts" / f"{sid}.json").read_text(encoding="utf-8"))
    words = [w for s in tr["segments"] for w in s["words"]]

    def at(sec: float) -> float:
        return curve[min(99, round(sec / length * 100))]

    steps = sorted({round(abs(a - b), 2) for a, b in zip(curve, curve[1:]) if abs(a - b) > 0.01})
    viewers = round(100 / steps[0]) if steps else None

    print(f"{sid}: {length:.1f} s, about {viewers} viewers in the sample (100 / smallest step)")
    print(f"average viewed about {sum(curve[:99]) / 99:.0f}% (last point ignored; quote Studio's own figure)")
    print("at second: " + "  ".join(f"{s}s {at(s):.0f}%" for s in SECONDS if s <= length))

    drops = sorted(((curve[p] - curve[p + 3], p) for p in range(96)), reverse=True)
    used: list[int] = []
    print("steepest drops (3% windows, last 3% ignored):")
    for d, p in drops:
        if d <= 0 or len(used) == 6:
            break
        if any(abs(p - q) < 4 for q in used):
            continue
        used.append(p)
        a, b = p / 100 * length, (p + 3) / 100 * length
        said = " ".join(w["word"].strip() for w in words if w["end"] > a - 0.3 and w["start"] < b)
        print(f"  -{d:4.1f}  {a:5.1f}-{b:5.1f} s  {said or '(pause)'}")


if __name__ == "__main__":
    main()
