"""Parses run 1 of a labs results log into JSON for the long-video lab scene (nothing typed by hand).
Usage: python tools/long_run1.py <results.txt> <out.json>"""
import json, re, sys
lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
out = {"machine": [], "variants": {}}
cur = None
for ln in lines:
    if ln.startswith("== run 2"):
        break
    m = re.match(r"== (\w+)$", ln)
    if m and m.group(1) not in ("machine", "run"):
        cur = m.group(1); out["variants"][cur] = {"lines": []}; continue
    if cur is None:
        continue
    m = re.match(r"^(\d+),(\d+)$", ln)
    if m:
        out["variants"][cur]["lines"].append({"rows": int(m.group(1)), "rate": int(m.group(2)), "raw": ln})
        continue
    m = re.match(r"load_s (\d+)\s+first_window ([\d,]+)/s\s+last_window ([\d,]+)/s\s+last/first ([\d.]+)", ln)
    if m:
        v = out["variants"][cur]; v.update(load_s=int(m.group(1)), first=int(m.group(2).replace(",", "")), last=int(m.group(3).replace(",", "")), last_first=float(m.group(4)))
    m = re.match(r"table_mb ([\d,]+)\s+pkey_mb (\d+)\s+pkey_bytes_per_row ([\d.]+)\s+leaf_density ([\d.]+)%", ln)
    if m:
        v = out["variants"][cur]; v.update(pkey_mb=int(m.group(2)), leaf_density=float(m.group(4)))
    m = re.match(r"wal_mb ([\d,]+)\s+wal_bytes_per_row (\d+)\s+full_page_images ([\d,]+)", ln)
    if m:
        v = out["variants"][cur]; v.update(fpi=int(m.group(3).replace(",", "")))
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), indent=1)
for k, v in out["variants"].items():
    print(k, len(v["lines"]), v.get("load_s"), v.get("last"), v.get("pkey_mb"), v.get("leaf_density"), v.get("fpi"))
