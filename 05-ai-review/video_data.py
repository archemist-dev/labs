"""Write the data for the Short "The checklist fix" (labs shorts 05-short2) from the grade files.

Usage: python -I video_data.py OUT.json
Per PR, for one run of each reviewer: comments, blocking comments, and whether the seeded bug was caught in a
blocking comment. Asserts the totals match summary.json for every run, so the video can't drift from the results.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
RUNS = HERE / "runs"
SHOWN_RUN = 1  # the run drawn as cards; spoken numbers are rounded over all 3 runs


def grades(reviewer, run):
    out = []
    for pr in sorted(p.name for p in (RUNS / reviewer).iterdir() if p.is_dir()):
        g = json.loads((RUNS / reviewer / pr / f"run{run}.grade.json").read_text())
        out.append({"pr": pr, "bug": pr.startswith("b"), "comments": g["comments"], "blocking": g["blocking"],
                    "caught": bool(g.get("caught_in_blocking")), "false_alarms": g.get("false_alarms_blocking", 0)})
    return out


# Real comment headings from the default reviewer, run 1, shown on the cards (Javlon, 2026-11-18: real text, so
# "can you spot the bug" is a real question). Each must appear verbatim in that PR's review. kind: bug = the comment
# that caught the seeded bug; block = a blocking comment that isn't the bug (tests, false alarms); nit = the rest.
CARDS = [
    ("b01-chain-from-view", "Blocking: this uses a stale read model to make a decision.", "bug"),
    ("b02-http-retry", "Blocking: retrying `/refunds` can issue duplicate refunds.", "bug"),
    ("b03-promo-on-total", "The change contradicts the documented promo terms (blocking).", "bug"),
    ("b04-summary-utc-day", "Bug (blocking): wrong day boundary.", "bug"),
    ("b05-notify-returns-status", "Blocking: this change breaks the retry path in `OrderService.dispatch`.", "bug"),
    ("b06-card-expired", "Blocking: `CardExpired` bypasses the cleanup in `place_order`.", "bug"),
    ("b07-zone-defaults", "Every zone without an offer now gets free delivery", "bug"),
    ("b08-flag-rename", "Blocking: the rename is incomplete, so it silently turns off surge pricing.", "bug"),
    ("b09-pickup-time-lost", "Blocking: `pick_up` never persists anything.", "bug"),
    ("b10-spread-units", "Blocking: unit mismatch in the new check (`orders/chain.py`)", "bug"),
    ("c02-retry-charges-only", "No tests (blocking).", "block"),
    ("c04-summary-london-day", "Day is chosen by `created_at`, not delivery time.", "block"),
    ("c04-summary-london-day", "No tests (main issue).", "block"),
    ("c05-notify-timeout-error", "The logs still can't tell timeouts from rejections (main issue)", "block"),
    ("b04-summary-utc-day", "Tests (blocking): none were added.", "block"),
    ("c07-zone-min-order", "No tests (should fix before merge)", "block"),
    ("c09-pickup-time-saved", "No tests (main blocker).", "block"),
    ("c02-retry-charges-only", "Real timeouts probably aren't retried.", "block"),
    ("c05-notify-timeout-error", "Magic string", "nit"),
    ("c05-notify-timeout-error", "Inconsistent exception messages", "nit"),
    ("c02-retry-charges-only", "Worst-case latency.", "nit"),
    ("c04-summary-london-day", "Duplicated logic with `daily_revenue`.", "nit"),
    ("c08-flag-rename-both", "Leftover \"surge\" naming", "nit"),
    ("c08-flag-rename-both", "Line length", "nit"),
    ("b02-http-retry", "Error context is lost.", "nit"),
    ("b02-http-retry", "Backoff.", "nit"),
    ("b05-notify-returns-status", "PII in logs.", "nit"),
    ("b09-pickup-time-lost", "Race condition.", "nit"),
    ("c07-zone-min-order", "The feature does nothing yet", "nit"),
    ("c07-zone-min-order", "Config validation (minor)", "nit"),
    ("c10-spread-metres", "Redundant check:", "nit"),
    ("c04-summary-london-day", "Performance.", "nit"),
    ("b01-chain-from-view", "The change doesn't deliver the stated benefit.", "nit"),
    ("c09-pickup-time-saved", "Unknown order id.", "nit"),
]


def diff_line(pr):
    """The PR's first added line of code (not an import), as the review UI shows above a comment."""
    import prs
    spec = next(p for p in prs.PRS if p["id"] == pr)
    for path, old, new in spec["edits"]:
        olds = set((old or "").splitlines())
        added = [l.strip() for l in new.splitlines() if l.strip() and l not in olds and not l.strip().startswith(("import ", "from ", "#"))]
        if added:
            return spec["title"], path, added[0]
    raise AssertionError(pr)


def cards():
    sys.path.insert(0, str(HERE))
    out = []
    for pr, text, kind in CARDS:
        review = json.loads((RUNS / "default" / pr / f"run{SHOWN_RUN}.json").read_text(encoding="utf-8"))["review"]
        assert text in review, (pr, text)
        assert (kind == "bug") == pr.startswith("b") or kind != "bug", (pr, kind)
        title, path, code = diff_line(pr)
        out.append({"pr": pr, "text": text.rstrip(".:"), "kind": kind, "title": title, "path": path, "code": code})
    assert sum(c["kind"] == "bug" for c in out) == 10 and len({c["pr"] for c in out if c["kind"] == "bug"}) == 10
    return out


def main(out):
    summary = json.loads((HERE / "summary.json").read_text())
    data = {"_source": "05-ai-review runs/*/<pr>/run<k>.grade.json, checked against summary.json", "shown_run": SHOWN_RUN}
    for reviewer in ("default", "checklist"):
        totals = []
        for run in (1, 2, 3):
            rows = grades(reviewer, run)
            s = summary[reviewer][f"run{run}"]
            got = {"comments": sum(r["comments"] for r in rows), "blocking": sum(r["blocking"] for r in rows),
                   "caught": sum(r["caught"] for r in rows if r["bug"])}
            want = {"comments": s["comments"], "blocking": s["blocking"], "caught": s["caught_blocking"]}
            assert got == want, (reviewer, run, got, want)
            totals.append(got)
        data[reviewer] = {"prs": grades(reviewer, SHOWN_RUN), "runs": totals}
    data["cards"] = cards()
    d, c = data["default"]["runs"], data["checklist"]["runs"]
    # The spoken numbers: "about 110 comments", "25 blocking", "10 bugs", checklist blocking 10-11.
    assert 105 <= min(r["comments"] for r in d) and max(r["comments"] for r in d) <= 115
    assert {r["blocking"] for r in d} <= {25, 26} and all(r["caught"] == 10 for r in d + c)
    assert {r["blocking"] for r in c} <= {10, 11}
    Path(out).write_text(json.dumps(data, indent=1) + "\n")
    print("default", d, "checklist", c)


if __name__ == "__main__":
    main(sys.argv[1])
