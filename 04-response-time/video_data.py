"""Write the week 4 Short's data (Sydney client to Frankfurt server, p50 per stage, run 1) for the Remotion scenes.

Usage: python3 video_data.py ../shorts/src/shorts/04-response-time/data.json
Asserts the numbers the Short speaks ("0.3 seconds, then 0.9", "4.8 milliseconds", "almost 0.6 seconds") hold in
both published runs, so the screen never shows a number the lab didn't measure. Standard library only.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNS = [json.loads((HERE / f"summary-sydney-run{i}.json").read_text())["anatomy"] for i in (1, 2)]


def p50(run, mode, stage):
    return run[mode][stage]["50"]


for run in RUNS:
    assert round(p50(run, "reused", "total") / 1000, 1) == 0.3  # "0.3 seconds"
    assert round(p50(run, "new", "total") / 1000, 1) == 0.9  # "then 0.9"
    assert round(p50(run, "new", "app"), 1) == 4.8 and round(p50(run, "reused", "app"), 1) == 4.8  # "4.8 ms, both times"
    setup = p50(run, "new", "tcp") + p50(run, "new", "tls")
    assert 550 < setup < 600, setup  # "almost 0.6 seconds"

run = RUNS[0]
ms = lambda mode, stage: round(p50(run, mode, stage), 1)
data = {
    "client": {"city": "Sydney", "lat": -33.87, "lon": 151.21, "region": "ap-southeast-2"},
    "server": {"city": "Frankfurt", "lat": 50.11, "lon": 8.68, "region": "eu-central-1"},
    "instance": "t3.micro",
    "new": {s: ms("new", s) for s in ("dns", "tcp", "tls", "wait", "app", "total")},
    "reused": {s: ms("reused", s) for s in ("wait", "app", "total")},
    # The response head the lab server sends (server.py); dur is the handler's own time, what a server log sees.
    "header": "Server-Timing: app;dur=%.3f" % p50(run, "new", "app"),
    "body_bytes": 462,
}
data["setup"] = round(data["new"]["tcp"] + data["new"]["tls"], 1)

out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, indent=1) + "\n")
print(json.dumps(data, indent=1))
