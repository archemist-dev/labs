"""Does a plan built from honest single-number estimates finish on time?

Model (Bernhardsson 2019): each task's actual time = estimate x blow-up, where the
blow-up is log-normal with median 1. The median task finishes exactly on its estimate,
so every estimate is honest; some tasks blow up, and nothing ever finishes in minus time.

Usage: python3 simulate.py [SIGMA]     (default 0.5; the sensitivity table runs 0.25, 0.5, 1.0)
Standard library only, fixed seeds: two runs print the same output on any machine.
"""
import json
import math
import random
import sys
from pathlib import Path

RUNS = 10_000            # simulated projects per plan
DEVELOPERS = 2
CAPACITY = 5 * DEVELOPERS  # dev-days per week
HISTORY_DAYS = 60        # past working days of throughput the team has (12 weeks)
CALIBRATION_TRIALS = 1_000
FORECAST_RUNS = 2_000    # resamples per throughput forecast
BUFFER = 1.2             # "add 20%"
SIGMAS = (0.25, 0.5, 1.0)

HERE = Path(__file__).parent
BACKLOG = json.loads((HERE / "backlog.json").read_text())
ESTIMATES = [t["estimate_days"] for t in BACKLOG["tasks"]]


def pct(xs, p):
    s = sorted(xs)
    return s[min(len(s) - 1, math.ceil(p / 100 * len(s)) - 1)]


def workdays(dev_days):
    """Working days for the team to deliver `dev_days` of work, rounded up to a whole day."""
    return math.ceil(dev_days / DEVELOPERS - 1e-9)


def actual_days(rng, sigma):
    return sum(e * rng.lognormvariate(0, sigma) for e in ESTIMATES)


def throughput_history(rng, sigma):
    """Items finished per working day over HISTORY_DAYS, for a team pulling tasks like these ones."""
    done, clock, day_end = [0] * HISTORY_DAYS, 0.0, DEVELOPERS
    day = 0
    while day < HISTORY_DAYS:
        clock += rng.choice(ESTIMATES) * rng.lognormvariate(0, sigma)
        while clock > day_end and day < HISTORY_DAYS:
            day, day_end = day + 1, day_end + DEVELOPERS
        if day < HISTORY_DAYS:
            done[day] += 1
    return done


def throughput_forecast(rng, history, items):
    """Working days to finish `items`, resampling past daily throughput (Vacanti, Magennis)."""
    out = []
    for _ in range(FORECAST_RUNS):
        left, w = items, 0
        while left > 0:
            left -= rng.choice(history)
            w += 1
        out.append(w)
    return pct(out, 50), pct(out, 85)


def plans(sigma):
    """Every plan as a deadline in working days. Monte Carlo plans come from separate streams."""
    plan_rng = random.Random(f"plan-{sigma}")
    sim = [actual_days(plan_rng, sigma) for _ in range(RUNS)]
    narrow = [actual_days(plan_rng, sigma / 2) for _ in range(RUNS)]
    point = sum(ESTIMATES)
    return {
        "sum of estimates": workdays(point),
        "sum + 20%": workdays(point * BUFFER),
        "Monte Carlo P50": workdays(pct(sim, 50)),
        "Monte Carlo P85": workdays(pct(sim, 85)),
        "P85, spread too narrow": workdays(pct(narrow, 85)),
    }


def evaluate(sigma):
    rng = random.Random(f"eval-{sigma}")
    outcomes = [actual_days(rng, sigma) for _ in range(RUNS)]
    point = sum(ESTIMATES)
    rows = {}
    for name, deadline in plans(sigma).items():
        late = [workdays(d) - deadline for d in outcomes if workdays(d) > deadline]
        rows[name] = {
            "deadline_workdays": deadline,
            "on_time_pct": round(100 * (1 - len(late) / RUNS), 1),
            "late_median_workdays": pct(late, 50) if late else 0,
            "late_p90_workdays": pct(late, 90) if late else 0,
        }
    ratios = sorted(d / point for d in outcomes)
    return {
        "sigma": sigma,
        "tasks": len(ESTIMATES),
        "estimate_days": point,
        "actual_days_p50": round(pct(outcomes, 50), 1),
        "actual_days_p85": round(pct(outcomes, 85), 1),
        "actual_days_p95": round(pct(outcomes, 95), 1),
        "project_over_estimate_p50_pct": round(100 * (pct(ratios, 50) - 1), 1),
        "plans": rows,
    }


def calibrate(sigma):
    """Throughput forecast vs what really happened, over many fresh projects."""
    rng = random.Random(f"calibrate-{sigma}")
    hit50 = hit85 = 0
    p85s = []
    for _ in range(CALIBRATION_TRIALS):
        history = throughput_history(rng, sigma)
        p50, p85 = throughput_forecast(rng, history, len(ESTIMATES))
        real = workdays(actual_days(rng, sigma))
        hit50 += real <= p50
        hit85 += real <= p85
        p85s.append(p85)
    example = throughput_history(random.Random(f"example-{sigma}"), sigma)
    ex50, ex85 = throughput_forecast(random.Random(f"example-fc-{sigma}"), example, len(ESTIMATES))
    return {
        "history_example": example,
        "forecast_example_p50_workdays": ex50,
        "forecast_example_p85_workdays": ex85,
        "p50_hit_pct": round(100 * hit50 / CALIBRATION_TRIALS, 1),
        "p85_hit_pct": round(100 * hit85 / CALIBRATION_TRIALS, 1),
        "p85_workdays_median": pct(p85s, 50),
    }


def main():
    sigma = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
    print(f"Backlog: {len(ESTIMATES)} tasks, {sum(ESTIMATES)} dev-days estimated, "
          f"team {CAPACITY} dev-days/week. Blow-up log-normal, median 1, sigma {sigma}. "
          f"{RUNS:,} simulated projects.\n")

    main_run = evaluate(sigma)
    print(f"Actual dev-days: P50 {main_run['actual_days_p50']}, P85 {main_run['actual_days_p85']}, "
          f"P95 {main_run['actual_days_p95']} (estimate {main_run['estimate_days']})")
    print(f"Each task finishes on its estimate at the median. The project: median "
          f"{main_run['project_over_estimate_p50_pct']}% over.\n")
    print("Deadlines and lateness in working days (the team works on 2 tasks at a time).")
    print(f"{'Plan':<24} {'Deadline':>9} {'On time':>8} {'Late by (median)':>17} {'Late by (P90)':>14}")
    for name, r in main_run["plans"].items():
        print(f"{name:<24} {r['deadline_workdays']:>7} d {r['on_time_pct']:>7}% "
              f"{r['late_median_workdays']:>15} d {r['late_p90_workdays']:>12} d")

    print("\nSensitivity: on time, by how wild the blow-ups are")
    print(f"{'sigma':<7} " + " ".join(f"{n:>23}" for n in main_run["plans"]))
    sens = {}
    for s in SIGMAS:
        r = main_run if s == sigma else evaluate(s)
        sens[str(s)] = r
        print(f"{s:<7} " + " ".join(
            f"{str(p['deadline_workdays']) + ' d ' + str(p['on_time_pct']) + '%':>23}"
            for p in r["plans"].values()))

    cal = calibrate(sigma)
    print(f"\nThroughput forecast (no estimates, only items finished per day, {HISTORY_DAYS} working days of history)")
    print(f"Example history: {cal['history_example']}")
    print(f"Example forecast for {len(ESTIMATES)} items: P50 {cal['forecast_example_p50_workdays']} d, "
          f"P85 {cal['forecast_example_p85_workdays']} d")
    print(f"Over {CALIBRATION_TRIALS:,} fresh projects: P50 met {cal['p50_hit_pct']}%, "
          f"P85 met {cal['p85_hit_pct']}% (median P85 {cal['p85_workdays_median']} d)")

    out = {"sigma": sigma, "main": main_run, "sensitivity": sens, "throughput": cal}
    (HERE / f"summary-sigma{sigma}.json").write_text(json.dumps(out, indent=2) + "\n")


if __name__ == "__main__":
    main()
