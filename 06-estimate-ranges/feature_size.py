"""Does a bigger feature miss its single-number date more often?

Same model as simulate.py (log-normal blow-up, median 1, every estimate honest), same team of 2.
The backlog is cut or repeated to each feature size, then each size is run 10,000 times.

Usage: python3 feature_size.py
Standard library only, fixed seeds: two runs print the same output on any machine.
"""
import json
import random
from itertools import cycle
from pathlib import Path

import simulate as S

SIZES_WEEKS = (1, 2, 5, 10, 20)  # calendar weeks for the team of 2 (2 = one sprint)
HERE = Path(__file__).parent


def backlog(dev_days):
    tasks, source = [], cycle(S.ESTIMATES)
    while sum(tasks) < dev_days:
        tasks.append(next(source))
    return tasks


def run(sigma, weeks):
    tasks = backlog(weeks * S.CAPACITY)
    point = sum(tasks)
    rng = random.Random(f"size-{sigma}-{weeks}")
    outcomes = [S.workdays(sum(e * rng.lognormvariate(0, sigma) for e in tasks)) for _ in range(S.RUNS)]
    deadline, buffered = S.workdays(point), S.workdays(point * S.BUFFER)
    late = [d - deadline for d in outcomes if d > deadline]
    return {
        "tasks": len(tasks),
        "estimate_dev_days": point,
        "deadline_workdays": deadline,
        "sum_on_time_pct": round(100 * sum(d <= deadline for d in outcomes) / S.RUNS, 1),
        "sum_plus_20_on_time_pct": round(100 * sum(d <= buffered for d in outcomes) / S.RUNS, 1),
        "late_median_workdays": S.pct(late, 50) if late else 0,
    }


def main():
    print(f"Single-number date by feature size. Team of {S.DEVELOPERS}, {S.RUNS:,} runs per row.\n")
    out = {}
    for sigma in S.SIGMAS:
        print(f"sigma {sigma}")
        print(f"{'Size':>9} {'Tasks':>6} {'Deadline':>9} {'Sum on time':>12} {'Sum + 20%':>10} {'Late by (median)':>17}")
        rows = {}
        for w in SIZES_WEEKS:
            r = rows[str(w)] = run(sigma, w)
            print(f"{w:>6} wk {r['tasks']:>6} {r['deadline_workdays']:>7} d {r['sum_on_time_pct']:>11}% "
                  f"{r['sum_plus_20_on_time_pct']:>9}% {r['late_median_workdays']:>15} d")
        out[str(sigma)] = rows
        print()
    (HERE / "summary-feature-size.json").write_text(json.dumps(out, indent=2) + "\n")


if __name__ == "__main__":
    main()
