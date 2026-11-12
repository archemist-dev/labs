"""Write the data for week 4 Short "The tail" (load steps and fan-out, London client, both runs).

Usage: python3 video_data2.py ../shorts/src/shorts/04-response-time/data2.json
Asserts the numbers the Short speaks ("56 milliseconds in one run, and 270 in the next", "4.8 milliseconds at every
load", "past 70% busy", "39% of pages") hold in the published runs. Standard library only.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNS = [json.loads((HERE / f"summary-run{i}.json").read_text())["load"] for i in (1, 2)]
STEPS = sorted(RUNS[0]["steps"], key=int)

for run in RUNS:
    for s in STEPS:
        assert abs(run["steps"][s]["app_p50"] - 4.8) < 0.1, (s, run["steps"][s]["app_p50"])  # "4.8 ms, at every load" (4.73-4.88)
        assert 0.385 <= run["steps"][s]["fanout"]["50"]["over_single_p99"] < 0.405  # measured 39-40% (README)
assert int(100 * (1 - 0.99**50)) == 39  # "39% of pages": 1 - 0.99^50 = 39.5%
assert round(RUNS[0]["steps"]["70"]["p99"]) == 56 and round(RUNS[1]["steps"]["70"]["p99"]) == 270  # "56, then 270"

data = {
    "instance": "t3.micro",
    "max_rps": [round(r["max_rps"]) for r in RUNS],
    "steps": [
        {
            "load": int(s),
            "rps": round(RUNS[0]["steps"][s]["rate"]),
            "p50": [round(r["steps"][s]["p50"], 1) for r in RUNS],
            "p99": [round(r["steps"][s]["p99"]) for r in RUNS],
            "app": round(RUNS[0]["steps"][s]["app_p50"], 1),
        }
        for s in STEPS
    ],
    "p99_70": [round(r["steps"]["70"]["p99"]) for r in RUNS],
    "fanout_n": 50,
    "fanout_slow_pct": int(100 * (1 - 0.99**50)),
    "fanout_measured": [round(100 * min(r["steps"][s]["fanout"]["50"]["over_single_p99"] for r in RUNS for s in STEPS)),
                        round(100 * max(r["steps"][s]["fanout"]["50"]["over_single_p99"] for r in RUNS for s in STEPS))],
}
out = Path(sys.argv[1])
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data["p99_70"], data["fanout_slow_pct"])
