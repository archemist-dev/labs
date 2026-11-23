"""Write the data for week 7 Short "The read that grows your table".

Usage: python3 video_data.py ../shorts/src/shorts/08-table-bloat/data.json
Reads the raw logs (run 1 of the 60-minute hold, both runs of the 10-minute variants), asserts the numbers the Short
speaks and shows (v3 script, 2026-11-23: "1.8 million dead rows, more than its 1 million real orders", "500 a second",
"cleanup ran 235 times, and deleted nothing", "the table didn't shrink", and from the 10-minute test "about 18,000,
instead of 300,000" dead rows at release), and writes the per-minute dead rows and cleanup count for the scenes. Standard library only.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HOUR = (HERE / "results-ec2-t3small-hour-2026-11-18.txt").read_text()
TEN = (HERE / "results-ec2-t3small-2026-11-18.txt").read_text()


def sections(text):
    """{(run, variant): (csv rows, summary line)} from a raw log."""
    out, run, name, rows, summary = {}, 0, None, [], None
    for line in text.splitlines():
        if line.startswith("== run "):
            run = int(line.split()[-1])
        elif line.startswith("== ") and line != "== machine":
            name, rows = line[3:], []
        elif name and re.match(r"^\d+,(start|hold|after),", line):
            rows.append(line.split(","))
        elif name and line.startswith("table_mb"):
            out[(run, name)] = (rows, line)
    return out


def sizes(summary):
    m = re.search(r"table_mb (\d+) -> (\d+).*free_space_mb (\d+)", summary)
    return int(m[1]), int(m[2]), int(m[3])


hour = sections(HOUR)
ten = sections(TEN)
rows, summary = hour[(1, "long_report")]
start, end, free = sizes(summary)
assert (start, end, free) == (120, 337, 210)  # "from 120 to 337 megabytes", "210 MB empty"
assert sizes(hour[(2, "long_report")][1])[1] == 336  # run 2 within 1 MB
hold = [r for r in rows if r[1] in ("start", "hold")]
autovac_hold = int(hold[-1][6])
assert autovac_hold == 235  # "Autovacuum ran about 235 times"
assert int(hold[-1][0]) == 3600
for r in hold[1:]:  # removed nothing while held: dead rows only climb
    assert int(r[5]) > 0
dead_release = int(hold[-1][5])
base_end = sizes(hour[(2, "baseline")][1])[1]
assert base_end == 122
for run in (1, 2):
    assert sizes(ten[(run, "report_timeout")][1])[1] == 124  # "Sixty seconds kept the table at 124"
    assert sizes(ten[(run, "idle_timeout")][1])[1] == 124
    assert sizes(ten[(run, "long_report")][1])[1] == 156
    assert sizes(ten[(run, "baseline")][1])[1] == 122


def first_after(rows):
    return next(r for r in rows if r[1] == "after")


assert round(dead_release / 100_000) == 18  # "1.8 million dead rows"
assert "rows 1,000,000," in HOUR and abs(int(hold[-1][4]) - 1_000_000) < 5_000  # "its 1 million real orders" (live is an estimate)
assert "rate 500/s" in HOUR  # "500 a second"
after = first_after(rows)
assert int(after[2]) == end  # the table didn't shrink: 337 MB after release ...
assert int(rows[-1][2]) == end and int(rows[-1][5]) < 20_000  # ... with the dead rows gone
ten_dead = {}
for run in (1, 2):
    for v in ("long_report", "report_timeout", "idle_timeout", "baseline"):
        ten_dead[(run, v)] = int(first_after(ten[(run, v)][0])[5])
    assert round(ten_dead[(run, "long_report")] / 10_000) == 30  # "instead of 300,000"
    for v in ("report_timeout", "idle_timeout"):  # "about 18,000": 17,193 to 18,194, the same as no report (baseline)
        assert round(ten_dead[(run, v)] / 1_000) in (17, 18)

data = {
    "start_mb": start,
    "end_mb": end,
    "free_mb": free,
    "baseline_mb": base_end,
    "autovacuums": autovac_hold,
    "dead_at_release": dead_release,
    "hold_minutes": 60,
    "updates_per_s": 500,
    "rows": 1_000_000,
    "timeout_mb": 124,
    "ten_min_no_timeout_mb": 156,
    "ten_min_baseline_mb": 122,
    "dead_ten_no_limit": ten_dead[(1, "long_report")],
    "dead_ten_limit": ten_dead[(1, "report_timeout")],
    "dead_ten_idle_limit": ten_dead[(1, "idle_timeout")],
    "dead_ten_baseline": ten_dead[(1, "baseline")],
    "dead_series": [[int(r[0]) // 60, int(r[5]), int(r[6])] for r in hold],
    # growth chart: minute, table MB, autovacuum runs (60-minute hold, run 1); the last point is after release
    "series": [[int(r[0]) // 60, int(r[2]), int(r[6])] for r in rows if r[1] in ("start", "hold")] + [[61, end, int(rows[len(hold)][6])]],
}
out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data["dead_at_release"], data["autovacuums"], data["end_mb"], ten_dead)
