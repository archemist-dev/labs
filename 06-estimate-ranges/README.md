# 06 - Does a plan built from honest estimates finish on time?

Someone asks "when will it be done?", the team adds up its task estimates and gives one date. This lab checks how often that date holds when **every estimate is honest**: each task is as likely to finish early as late.

```bash
python3 simulate.py          # sigma 0.5 (default), plus the sensitivity table
python3 simulate.py 1.0      # wilder blow-ups as the main run
python3 diagrams.py OUT_DIR  # article PNGs (needs Google Chrome)
```

Standard library only (Python 3.12+). Fixed seeds and no timings: the output is deterministic, so the machine doesn't matter and two runs must match exactly ([results-mac-2026-11-13.txt](results-mac-2026-11-13.txt), [results-feature-size-mac-2026-11-13.txt](results-feature-size-mac-2026-11-13.txt)). GitHub Actions re-runs it and fails if two runs differ.

## The model

- **Backlog** ([backlog.json](backlog.json)): one sprint-sized slice of a feature, "scheduled orders" for a delivery app, cut into 9 tasks of 1 to 3 days. 20 dev-days estimated in total: one 2-week sprint for the team.
- **Team**: 2 developers, 10 dev-days a week. The project takes the work's total over two people (perfect parallel work, no waiting on each other, which flatters every plan).
- **Each task's actual time** = estimate x blow-up. The blow-up is log-normal with median 1 (Bernhardsson 2019): half the tasks finish on or under estimate, half over, and none in negative time. Sigma sets how wild the blow-ups are: 0.25 (a team doing work it knows well), 0.5 (default), 1.0 (new domain, new tech). At 0.5, about 1 task in 12 takes twice its estimate or more.
- **Plans compared**, each a deadline in whole working days:
  1. **Sum of estimates**: the single number.
  2. **Sum + 20%**: the usual flat buffer.
  3. **Monte Carlo P50 and P85**: simulate the backlog 10,000 times, take the day by which 50% and 85% of runs finish. Uses the true spread.
  4. **P85, spread too narrow**: the same, but the team guesses its blow-ups at half their real size (sigma 0.25 when it's 0.5).
- **Throughput forecast** (no estimates at all): 60 working days (12 weeks) of history of items finished per day, simulated with the same tasks and blow-ups. Resample those days 2,000 times until the 9 items are done (Vacanti, Magennis). Checked against what really happened on 1,000 fresh projects. Per day, not per week: a one-sprint slice is too short for weekly counts.
- **Feature size** (`feature_size.py`): the same backlog cut or repeated to 1 to 20 weeks of work for the team, 10,000 runs per size.

Each plan is scored on 10,000 simulated projects drawn from a different random stream than the one the Monte Carlo plans were built from.

## Results (2026-11-13)

Sigma 0.5. Actual dev-days: P50 22.2, P85 27.0, P95 30.3, against 20 estimated. Each task lands on its estimate at the median; the whole slice lands 11% over at the median.

| Plan | Deadline | On time | Late by (median) | Late by (P90) |
|---|---|---|---|---|
| Sum of estimates | 10 d | **28.0%** | 2 d | 5 d |
| Sum + 20% | 12 d | 65.8% | 2 d | 4 d |
| Monte Carlo P50 | 12 d | 65.8% | 2 d | 4 d |
| Monte Carlo P85 | 14 d | **88.9%** | 2 d | 4 d |
| P85, spread too narrow | 12 d | 65.8% | 2 d | 4 d |

Late by = working days past the deadline, among late runs only. At this size deadlines are whole days, so several plans land on the same day (12 d).

**Sensitivity**, on time by how wild the blow-ups are:

| Sigma | Sum of estimates | Sum + 20% | Monte Carlo P50 | Monte Carlo P85 | P85, spread too narrow |
|---|---|---|---|---|---|
| 0.25 | 10 d, 37.3% | 12 d, 95.8% | 11 d, 77.7% | 12 d, 95.8% | 11 d, 77.7% |
| 0.5 | 10 d, 28.0% | 12 d, 65.8% | 12 d, 65.8% | 14 d, 88.9% | 12 d, 65.8% |
| 1.0 | 10 d, 16.1% | 12 d, 29.9% | 15 d, 51.3% | 23 d, 84.6% | 14 d, 44.3% |

**Throughput forecast** (sigma 0.5): an example 60-day history gives P50 11 days, P85 14 days for the 9 items. Over 1,000 fresh projects, the P50 date was met 52.5% of the time and the P85 date 90.0%.

**Feature size**, on time for the single-number date (sum of estimates):

| Size | Familiar (0.25) | Default (0.5) | New domain (1.0) | Late by, median (0.5) |
|---|---|---|---|---|
| 1 week | 43.9% | 36.2% | 28.7% | 2 d |
| 2 weeks (one sprint) | 38.4% | 28.4% | 16.1% | 2 d |
| 5 weeks | 30.0% | 16.2% | 4.1% | 4 d |
| 10 weeks | 21.2% | 7.6% | 0.4% | 7 d |
| 20 weeks | 13.3% | 1.6% | 0.0% | 14 d |

(The 2-week row differs slightly from the main run, 28.4% vs 28.0%: different random stream.) Sum + 20% moves the other way on familiar and default work (66.5% at 2 weeks, 84.0% at 20) and collapses on new work (30.3% to 0.9%).

## What it shows

- Honest estimates still make a late plan, even for one sprint. With no task padded or lowballed, the sum is met a bit more than 1 time in 4 (28.0%). Blow-ups only go one way: a task can't finish in minus 3 days, but it can take 3x.
- The wilder the work, the worse the single number: 37% on time for familiar work, 16% for a new domain.
- A flat 20% buffer is right only by luck: more than needed for familiar work (96%), far too little for new work (30%). It doesn't know your spread.
- A P85 date holds close to 85% at every spread (96%, 89%, 85%), because it's built from the spread.
- A range is only as good as its spread. Guess blow-ups at half their size and the "85%" date holds 66%. The spread has to come from history, not from a feeling.
- Counting finished items per day needs no estimates and gives a calibrated date: P85 met 90.0%.
- The bigger the feature, the less often its single-number date holds and the further it slips: one sprint 28%, 20 weeks 1.6% (14 days late at the median). Splitting into sprint-sized slices keeps each promise small and each miss short; it doesn't shrink the total.

## Limits

- Synthetic: one backlog, one blow-up model, no real team data. The model (right-skewed, median on estimate) is the one in Bernhardsson's post; the sigmas are chosen, not measured.
- Perfect parallel work and a fixed scope. Real projects add waiting, dependencies and scope growth, which push every plan later.
- Tasks blow up independently. In real projects they often blow up together (the same wrong assumption under five tasks), which widens the range further.
- The throughput history comes from the same kind of work as the backlog. If the next slice is unlike the last 12 weeks, so is the forecast.
- Whole-day rounding makes the dates slightly conservative at this size (P85 met 88.9%, throughput P85 90.0%).

## Sources

- Erik Bernhardsson, "Why software projects take longer than you think: a statistical model" (2019)
- Daniel Vacanti, *When Will It Be Done?* (2020)
- Troy Magennis, *Forecasting and Simulating Software Development Projects* (2011)
