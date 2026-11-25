"""Write the data for week 7 Short "The replica that brings the bloat back".

Usage: python3 video_data2.py ../shorts/src/shorts/08-table-bloat/data2.json
Reads both runs of the 10-minute variants and asserts the numbers the Short speaks and shows (v2 script, 2026-11-25):
"300,000 dead rows in ten minutes, as if the report never moved" (report on a replica with hot_standby_feedback on,
against the same report on the main database), "under 20,000, about the same as with no report" (feedback off, against
the baseline), and that with feedback off the replica cancelled the report. Dead rows are counted on the main database
right after the hold (the first "after" sample). Standard library only.
"""
import json
import sys
from pathlib import Path

from video_data import TEN, first_after, sections

ten = sections(TEN)
dead = {(run, v): int(first_after(ten[(run, v)][0])[5]) for run in (1, 2) for v in ("replica_feedback", "replica_no_feedback", "long_report", "baseline")}
for run in (1, 2):
    assert round(dead[(run, "replica_feedback")] / 10_000) == 30  # "300,000 dead rows in ten minutes"
    assert round(dead[(run, "long_report")] / 10_000) == 30  # "as if the report never moved"
    assert dead[(run, "replica_no_feedback")] < 20_000  # "stayed under 20,000"
    assert abs(dead[(run, "replica_no_feedback")] - dead[(run, "baseline")]) < 3_000  # "about the same as with no report"
assert "canceling statement due to conflict with recovery" in TEN  # "the replica now cancels long reports"

data = {
    "minutes": 10,
    "dead_feedback_on": dead[(1, "replica_feedback")],
    "dead_on_main": dead[(1, "long_report")],
    "dead_feedback_off": dead[(1, "replica_no_feedback")],
    "dead_no_report": dead[(1, "baseline")],
    "rows": 1_000_000,
    "updates_per_s": 500,
}
out = Path(sys.argv[1])
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data)
