"""Write the lab data for the table-bloat long video (nothing typed by hand).

Usage: python3 long_video_data.py ../shorts/src/long/08-table-bloat/logs.json
Reads run 1 of both raw logs, asserts every number the script speaks (studio note "Table Bloat - long video"), and
writes: the per-minute rows of the 60-minute hold (lab scene 1), each 10-minute variant's outcome and sizes (lab
scene 2), and the pages a scan reads before and after. Standard library only.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HOUR_FILE, TEN_FILE = "results-ec2-t3small-hour-2026-11-18.txt", "results-ec2-t3small-2026-11-18.txt"
COLS = "t_s,phase,table_mb,index_mb,live,dead,autovacuums,xmin_age_tx,by_id_ms,by_id_pages,by_status_ms,by_status_pages,admin_filter_ms,admin_filter_pages".split(",")


def run1(name):
    """{variant: {"rows": [dict], "holder": line, "summary": line}} for run 1 of a raw log."""
    out, cur, skip = {}, None, False
    for line in (HERE / name).read_text().splitlines():
        if line.startswith("== run 2"):  # run 2 is skipped; the hour log's baseline block comes after it
            skip, cur = True, None
        elif line.startswith("== baseline 60 min"):
            skip = False
            continue
        if skip:
            continue
        if line.startswith("== ") and line not in ("== run 1", "== machine"):
            cur = out.setdefault(line[3:], {"rows": []})
        elif cur is not None and re.match(r"^\d+,(start|hold|after),", line):
            v = line.split(",")
            cur["rows"].append({k: (x if k == "phase" else float(x) if "." in x else int(x)) for k, x in zip(COLS, v)})
        elif cur is not None and line.startswith("updates"):
            cur["holder"] = line
        elif cur is not None and line.startswith("table_mb"):
            cur["summary"] = line
    return out


def sizes(summary):
    m = re.search(r"table_mb (\d+) -> (\d+) \(([\d.]+)x\)\s+indexes_mb (\d+) -> (\d+) \(([\d.]+)x\).*free_space_mb (\d+)", summary)
    return {"table": [int(m[1]), int(m[2])], "table_x": float(m[3]), "index": [int(m[4]), int(m[5])], "index_x": float(m[6]), "free_mb": int(m[7])}


hour, ten = run1(HOUR_FILE), run1(TEN_FILE)
rep, base = hour["long_report"], hour["baseline"]
hold = [r for r in rep["rows"] if r["phase"] == "hold"]
after = [r for r in rep["rows"] if r["phase"] == "after"]
s = sizes(rep["summary"])

# what the script says
assert s["table"] == [120, 337] and s["table_x"] == 2.8 and s["index"] == [28, 61] and s["index_x"] > 2
assert sizes(base["summary"])["table"] == [120, 122]
assert 3500 < hold[0]["dead"] < 4500, "about 4,000 dead rows when the report starts"
assert 295_000 < hold[10]["dead"] < 305_000, "300,000 ten minutes later"
assert round(max(r["dead"] for r in rep["rows"]) / 1e6, 1) == 1.8 and hold[-1]["autovacuums"] == 235
assert s["free_mb"] == 210 and after[-1]["admin_filter_pages"] == 43080
base_pages = base["rows"][-1]["admin_filter_pages"]
assert base_pages == 15589 and hold[0]["by_id_pages"] == 7 and after[-1]["by_id_pages"] == 7
assert 205 < (s["table"][1] - 122) < 220, "about 215 MB an hour"

variants = {}
for name, want in [("long_report", 156), ("idle_tx", 156), ("idle_timeout", 124), ("report_timeout", 124), ("replica_feedback", 157), ("replica_no_feedback", 122), ("baseline", 122)]:
    v = ten[name]
    z = sizes(v["summary"])
    assert z["table"] == [120, want], (name, z)
    outcome = v["holder"].split("outcome: ")[1].strip()
    variants[name] = {"outcome": re.sub(r"\s+", " ", outcome), "table": z["table"], "summary": v["summary"].split("  indexes")[0]}
assert "idle-in-transaction timeout" in variants["idle_timeout"]["outcome"]
assert "statement timeout" in variants["report_timeout"]["outcome"]
assert "conflict with recovery" in variants["replica_no_feedback"]["outcome"]

machine = "t3.small · eu-central-1 · Xeon 8259CL · PostgreSQL 18.7"
out = {
    "machine": machine,
    "files": {"hour": HOUR_FILE, "ten": TEN_FILE},
    "hour": {
        "rows": [{"min": (r["t_s"] - hold[0]["t_s"]) // 60, "table": r["table_mb"], "dead": r["dead"], "av": r["autovacuums"]} for r in hold],
        "release": {"table": after[0]["table_mb"], "dead": after[0]["dead"], "av": after[0]["autovacuums"]},
        "summary": rep["summary"].split("  live")[0],
        "table": s["table"], "table_x": s["table_x"], "index": s["index"], "index_x": s["index_x"], "free_mb": s["free_mb"],
        "baseline_mb": 122,
    },
    "scan": {"base_pages": base_pages, "after_pages": after[-1]["admin_filter_pages"], "id_pages": 7},
    "ten": variants,
}
Path(sys.argv[1]).parent.mkdir(parents=True, exist_ok=True)
Path(sys.argv[1]).write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(len(out["hour"]["rows"]), "hold rows;", {k: v["table"][1] for k, v in variants.items()})
