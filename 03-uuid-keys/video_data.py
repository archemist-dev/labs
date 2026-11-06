"""Write the week 3 Shorts' data (insert rate per million rows, leaf density, index size; run 1) for the Remotion scenes.

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

# Seconds to load 10M rows per variant (the cheap-fixes scene).
data["load_s"] = {k: int(runs[k]["load_s"]) for k in ("bigint", "v7", "v4", "v4_ff70", "bigint_public_v4")}
assert data["load_s"] == {"bigint": 58, "v7": 90, "v4": 391, "v4_ff70": 514, "bigint_public_v4": 410}, data["load_s"]

# Short 2 "Where the next row lands": leaf density and primary key index size (run 1).
data["leaf_density"] = {k: runs[k]["leaf_density"] for k in ("v7", "v4")}
data["pkey_mb"] = {k: int(runs[k]["pkey_mb"]) for k in ("v7", "v4")}
assert round(data["leaf_density"]["v4"]) == 70 and round(data["leaf_density"]["v7"]) == 90  # "70% full", "90%"
assert data["pkey_mb"] == {"v7": 301, "v4": 389}, data["pkey_mb"]
assert round((data["pkey_mb"]["v4"] / data["pkey_mb"]["v7"] - 1) * 100) == 29  # "29% bigger"

out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, indent=1) + "\n")
print(f"wrote {out}")
