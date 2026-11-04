"""Write the week 3 Short's data (insert rate per million rows, run 1) for the Remotion scenes.

Usage: python3 video_data.py ../shorts/src/shorts/03-uuid-keys/data.json
Asserts the numbers the Short speaks match the published results.
"""
import json
import sys
from pathlib import Path

from diagrams import parse

HERE = Path(__file__).resolve().parent
LOG = HERE / "results-ec2-t3small-2026-10-27.txt"

runs = parse(LOG, 1)
data = {
    key: {"rows": [r for r, _ in runs[key]["curve"]], "rate": [v for _, v in runs[key]["curve"]]}
    for key in ("bigint", "v7", "v4")
}
assert data["v4"]["rate"][-1] == 6645, data["v4"]["rate"][-1]  # "6,600 rows a second"
assert data["v7"]["rate"][-1] == 93023, data["v7"]["rate"][-1]  # "93,000"
assert round(data["v7"]["rate"][-1] / data["v4"]["rate"][-1]) == 14  # "fourteen times"
assert data["v4"]["rows"][-1] == 10_000_000

out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, indent=1) + "\n")
print(f"wrote {out}")
