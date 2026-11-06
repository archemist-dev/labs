"""Run each reviewer over each PR, N times, with Claude Code in headless mode.

Every run gets a fresh git repo: service/ committed on `main`, the PR's edits committed on `pr`.
Claude Code runs with --bare (no hooks, no CLAUDE.md, no memory, no MCP), read-only tools, in that repo.
Auth: ANTHROPIC_API_KEY from your environment (--bare reads nothing else). Never put the key in a file here.

    python3 review.py                     # all reviewers, all PRs, 3 runs
    RUNS=1 PRS=b01-swallowed-notify,c09-guest-sms-best-effort python3 review.py   # quick try
    MODEL=claude-sonnet-5-5 python3 review.py

Raw outputs: runs/<reviewer>/<pr>/run<k>.json (skipped if present, so an interrupted run resumes).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from prs import PRS

HERE = Path(__file__).parent
SERVICE = HERE / "service"
RUNS_DIR = HERE / "runs"

MODEL = os.environ.get("MODEL", "claude-sonnet-5-5")
RUNS = int(os.environ.get("RUNS", "3"))
ONLY = set(filter(None, os.environ.get("PRS", "").split(",")))

CONTEXT = """You are reviewing a pull request in this repository. The PR is branch `pr`, opened against `main`.
Title: {title}
Description: {body}

Use `git diff main...pr` to see the change, and read any files you need.
"""

REVIEWERS = {
    # The generic prompt teams start with, after the Claude Code GitHub Action's example review workflow.
    "default": CONTEXT + """
Please review this pull request and provide feedback on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Test coverage

Write your review as the comments you would post on the PR.
""",
    # The narrow version: only ways the change can fail without anyone noticing.
    "checklist": CONTEXT + """
Review only for silent failures: ways this change can do the wrong thing while returning success and raising no error.
First read what the change depends on outside the diff: its callers, the docstrings and comments of what it calls,
config defaults and flags. Then check each of these:
- Errors caught and not re-raised, or logged and dropped
- Retries: is every retried call idempotent (same key, safe to repeat)?
- Defaults for missing or null values: is the default correct, or does it hide missing data?
- Time: time zones, daylight saving, naive datetimes
- Money: floats, rounding, currency units
- Concurrency: read-modify-write without compare-and-set or a lock
- Return values that signal failure and are ignored
- Multi-step writes with no rollback when a later step fails
- Health checks or fallbacks that report OK while something is broken
- Contracts: does the change still keep every rule stated elsewhere (units, time zones, which errors callers catch,
  what a default means, whether a call is safe to repeat, whether a read is a copy or a stale view)?

Ignore style, naming and refactoring suggestions.
For each finding write one comment starting with [BLOCKING] or [NIT].
Use [BLOCKING] only when you can name a concrete input or event that makes the change fail silently.
If you find nothing, say "No silent failures found."
""",
}

TOOLS = ["Read", "Grep", "Glob", "Bash(git diff:*)", "Bash(git show:*)", "Bash(git log:*)"]


def git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


def apply(root: Path, edits):
    for path, old, new in edits:
        f = root / path
        if old is None:
            f.write_text(new)
            continue
        text = f.read_text()
        if text.count(old) != 1:
            raise SystemExit(f"{path}: edit target found {text.count(old)} times, expected 1")
        f.write_text(text.replace(old, new))


def build_repo(pr) -> Path:
    root = Path(tempfile.mkdtemp(prefix=f"review-{pr['id']}-"))
    shutil.copytree(SERVICE, root, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__"))
    git(root, "init", "-q", "-b", "main")
    git(root, "-c", "user.name=dev", "-c", "user.email=dev@example.com", "add", "-A")
    git(root, "-c", "user.name=dev", "-c", "user.email=dev@example.com", "commit", "-q", "-m", "order service")
    git(root, "checkout", "-q", "-b", "pr")
    apply(root, pr["edits"])
    git(root, "-c", "user.name=dev", "-c", "user.email=dev@example.com", "add", "-A")
    git(root, "-c", "user.name=dev", "-c", "user.email=dev@example.com", "commit", "-q", "-m", pr["title"])
    return root


def review(root: Path, prompt: str) -> dict:
    cmd = [
        "claude", "-p", prompt,
        "--bare", "--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands",
        "--model", MODEL, "--output-format", "json",
        "--allowedTools", *TOOLS,
    ]
    out = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=600)
    if out.returncode != 0:
        raise RuntimeError(f"claude exited {out.returncode}: {out.stderr.strip()[-500:]}")
    return json.loads(out.stdout)


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY is not set in this shell (export it from your shell profile or keychain).")
    prs = [p for p in PRS if not ONLY or p["id"] in ONLY]
    for name, template in REVIEWERS.items():
        for pr in prs:
            for k in range(1, RUNS + 1):
                dest = RUNS_DIR / name / pr["id"] / f"run{k}.json"
                if dest.exists():
                    continue
                root = build_repo(pr)
                try:
                    res = review(root, template.format(title=pr["title"], body=pr["body"]))
                finally:
                    shutil.rmtree(root)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(json.dumps({
                    "reviewer": name, "pr": pr["id"], "run": k, "model": MODEL,
                    "review": res.get("result", ""),
                    "cost_usd": res.get("total_cost_usd"),
                    "usage": res.get("usage"),
                    "num_turns": res.get("num_turns"),
                }, indent=2))
                print(f"{name:9} {pr['id']:28} run{k}  ${res.get('total_cost_usd') or 0:.4f}", flush=True)


if __name__ == "__main__":
    main()
