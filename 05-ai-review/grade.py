"""Grade every review in runs/ with a judge model, then print the results table.

The judge sees the diff, the review, and the answer key from prs.py (the seeded bug, or what is intended).
Grades are saved next to each run as run<k>.grade.json so a person can spot-check them; delete one to re-grade.

    python3 grade.py
    JUDGE_MODEL=claude-opus-5-5 python3 grade.py
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from statistics import mean

from prs import PRS
from review import RUNS_DIR, build_repo

JUDGE_MODEL = os.environ.get("JUDGE_MODEL", "claude-opus-5-5")
BY_ID = {p["id"]: p for p in PRS}

SCHEMA = {
    "type": "object",
    "properties": {
        "comments": {"type": "integer", "description": "separate review comments or findings in the review"},
        "blocking": {"type": "integer", "description": "comments presented as a defect that must be fixed before merge"},
        "caught": {"type": "boolean", "description": "bug PRs: some comment names the seeded bug or its effect; clean PRs: false"},
        "caught_in_blocking": {"type": "boolean", "description": "bug PRs: a blocking comment names the seeded bug; clean PRs: false"},
        "false_alarms": {"type": "integer", "description": "clean PRs: comments claiming a defect that is not real; bug PRs: 0"},
        "false_alarms_blocking": {"type": "integer", "description": "clean PRs: blocking comments claiming a defect that is not real; bug PRs: 0"},
        "why": {"type": "string", "description": "one or two sentences"},
    },
    "required": ["comments", "blocking", "caught", "caught_in_blocking", "false_alarms", "false_alarms_blocking", "why"],
}

JUDGE = """You grade a code review of a pull request. Be strict and literal.

PR kind: {kind}
Answer key: {key}

The diff:
{diff}

The review:
<review>
{review}
</review>

Rules:
- caught: the review names the seeded bug or its concrete effect (not just the general area, not a vague "consider error handling").
- A comment is blocking when it is presented as a defect to fix before merge ([BLOCKING], "bug", "must", "this will..."), not a suggestion, nit, question or praise.
- false alarms (clean PRs only): comments that claim the change is wrong or will misbehave when, given the answer key, it is not. Style, naming, test or docs suggestions are not false alarms.
"""


def diff_of(pr) -> str:
    root = build_repo(pr)
    try:
        return subprocess.run(["git", "diff", "main...pr"], cwd=root, capture_output=True, text=True, check=True).stdout
    finally:
        shutil.rmtree(root)


def judge(pr, review_text) -> dict:
    key = f"seeded bug: {pr['bug']}" if pr["kind"] == "bug" else f"no defect; intended: {pr['note']}"
    prompt = JUDGE.format(kind=pr["kind"], key=key, diff=diff_of(pr), review=review_text)
    cmd = [
        "claude", "-p", prompt,
        "--bare", "--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands",
        "--model", JUDGE_MODEL, "--output-format", "json", "--json-schema", json.dumps(SCHEMA),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if out.returncode != 0:
        raise RuntimeError(f"judge exited {out.returncode}: {out.stderr.strip()[-500:]}")
    res = json.loads(out.stdout)
    grade = res.get("structured_output") or json.loads(res["result"])
    grade["judge_model"] = JUDGE_MODEL
    grade["judge_cost_usd"] = res.get("total_cost_usd")
    return grade


def grade_all():
    for run_file in sorted(RUNS_DIR.glob("*/*/run*.json")):
        if run_file.name.endswith(".grade.json"):
            continue
        dest = run_file.with_suffix(".grade.json")
        if dest.exists():
            continue
        run = json.loads(run_file.read_text())
        g = judge(BY_ID[run["pr"]], run["review"])
        dest.write_text(json.dumps(g, indent=2))
        print(f"graded {run['reviewer']:9} {run['pr']:28} run{run['run']}  caught={g['caught']} fa={g['false_alarms']}", flush=True)


def summarize() -> dict:
    """Per reviewer and level, per run index: totals over the 10 bug PRs and the 10 clean PRs."""
    rows = {}
    for reviewer_dir in sorted(p for p in RUNS_DIR.iterdir() if p.is_dir()):
        per_run = {}
        for gf in reviewer_dir.glob("*/run*.grade.json"):
            pr = BY_ID[gf.parent.name]
            k = gf.name.split(".")[0]
            g = json.loads(gf.read_text())
            run = json.loads(gf.with_name(f"{k}.json").read_text())
            r = per_run.setdefault(k, {"caught": 0, "caught_blocking": 0, "fa": 0, "fa_blocking": 0,
                                       "comments": 0, "blocking": 0, "cost": 0.0, "n": 0, "bugs": 0, "clean": 0})
            r["n"] += 1
            r["bugs" if pr["kind"] == "bug" else "clean"] += 1
            r["caught"] += g["caught"]
            r["caught_blocking"] += g["caught_in_blocking"]
            r["fa"] += g["false_alarms"]
            r["fa_blocking"] += g["false_alarms_blocking"]
            r["comments"] += g["comments"]
            r["blocking"] += g["blocking"]
            r["cost"] += run["cost_usd"] or 0
        rows[reviewer_dir.name] = per_run
    return rows


def spread(values, fmt="{:.1f}"):
    if not values:
        return "-"
    lo, hi, m = min(values), max(values), mean(values)
    return fmt.format(m) if lo == hi else f"{fmt.format(m)} ({fmt.format(lo)}-{fmt.format(hi)})"


def table(rows):
    print("\n| Level | Silent failures caught (of 10) | False alarms per clean PR | Comments per PR | Cost per PR |")
    print("|---|---|---|---|---|")
    levels = [
        ("1. Default prompt", "default", False),
        ("2. Checklist prompt", "checklist", False),
        ("3. Checklist, blocking only", "checklist", True),
    ]
    for label, reviewer, blocking_only in levels:
        runs = list(rows.get(reviewer, {}).values())
        if not runs:
            continue
        caught = [r["caught_blocking" if blocking_only else "caught"] for r in runs]
        fa = [r["fa_blocking" if blocking_only else "fa"] / max(r["clean"], 1) for r in runs]
        comments = [r["blocking" if blocking_only else "comments"] / r["n"] for r in runs]
        cost = [r["cost"] / r["n"] for r in runs]
        print(f"| {label} | {spread(caught)} | {spread(fa)} | {spread(comments)} | {spread(cost, '${:.3f}')} |")
    print("\nMean over runs, range in brackets. Level 3 is level 2's output with only [BLOCKING] comments posted.")


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY is not set in this shell.")
    grade_all()
    rows = summarize()
    (Path(__file__).parent / "summary.json").write_text(json.dumps(rows, indent=2))
    table(rows)


if __name__ == "__main__":
    main()
