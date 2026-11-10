# 06 - Does a plan built from honest estimates finish on time?

Someone asks "when will it be done?", the team adds up its task estimates and gives one date. This lab checks how often that date holds when **every estimate is honest**: each task is as likely to finish early as late.

```bash
python3 simulate.py          # sigma 0.5 (default), plus the sensitivity table
python3 simulate.py 1.0      # wilder blow-ups as the main run
```

Standard library only (Python 3.12+). Fixed seeds and no timings: the output is deterministic, so the machine doesn't matter and two runs must match exactly ([results-mac-2026-11-10.txt](results-mac-2026-11-10.txt)). GitHub Actions re-runs it and fails if two runs differ.

## The model

- **Backlog** ([backlog.json](backlog.json)): one feature, "scheduled orders" for a delivery app, cut into 20 tasks of 1 to 5 days. 50 dev-days estimated in total.
- **Team**: 2 developers, 10 dev-days a week. The project takes the work's total over two people (perfect parallel work, no waiting on each other, which flatters every plan).
- **Each task's actual time** = estimate x blow-up. The blow-up is log-normal with median 1 (Bernhardsson 2019): half the tasks finish on or under estimate, half over, and none in negative time. Sigma sets how wild the blow-ups are: 0.25 (a team doing work it knows well), 0.5 (default), 1.0 (new domain, new tech). At 0.5, about 1 task in 12 takes twice its estimate or more.
- **Plans compared**, each a deadline in working days:
  1. **Sum of estimates**: the single number.
  2. **Sum + 20%**: the usual flat buffer.
  3. **Monte Carlo P50 and P85**: simulate the backlog 10,000 times, take the day by which 50% and 85% of runs finish. Uses the true spread.
  4. **P85, spread too narrow**: the same, but the team guesses its blow-ups at half their real size (sigma 0.25 when it's 0.5).
- **Throughput forecast** (no estimates at all): 12 weeks of history of items finished per week, simulated with the same tasks and blow-ups. Resample those weeks 2,000 times until 20 items are done (Vacanti, Magennis). Checked against what really happened on 1,000 fresh projects.

Each plan is scored on 10,000 simulated projects drawn from a different random stream than the one the Monte Carlo plans were built from.

## Results (2026-11-10)

Sigma 0.5. Actual dev-days: P50 56.1, P85 64.3, P95 69.8, against 50 estimated. Each task lands on its estimate at the median; the whole project lands 12% over at the median.

| Plan | Deadline | On time | Late by (median) | Late by (P90) |
|---|---|---|---|---|
| Sum of estimates | 25 d | **19.1%** | 4 d | 9 d |
| Sum + 20% | 30 d | 70.2% | 3 d | 7 d |
| Monte Carlo P50 | 29 d | 60.5% | 3 d | 7 d |
| Monte Carlo P85 | 33 d | **88.9%** | 2 d | 6 d |
| P85, spread too narrow | 28 d | 49.6% | 3 d | 7 d |

Late by = working days past the deadline, among late runs only.

**Sensitivity**, on time by how wild the blow-ups are:

| Sigma | Sum of estimates | Sum + 20% | Monte Carlo P50 | Monte Carlo P85 | P85, spread too narrow |
|---|---|---|---|---|---|
| 0.25 | 25 d, 32.2% | 30 d, 99.2% | 26 d, 56.7% | 28 d, 90.8% | 26 d, 56.7% |
| 0.5 | 25 d, 19.1% | 30 d, 70.2% | 29 d, 60.5% | 33 d, 88.9% | 28 d, 49.6% |
| 1.0 | 25 d, 5.3% | 30 d, 18.4% | 39 d, 51.0% | 54 d, 85.8% | 33 d, 28.9% |

**Throughput forecast** (sigma 0.5): example history `[4, 3, 3, 4, 4, 5, 5, 1, 5, 4, 5, 4]` items a week gives P50 5 weeks, P85 6 weeks for the 20 items. Over 1,000 fresh projects, the P50 date was met 66.3% of the time and the P85 date 89.7%.

## What it shows

- Honest estimates still make a late plan. With no task padded or lowballed, the sum is met 1 time in 5 (19.1%). Blow-ups only go one way: a task can't finish in minus 3 days, but it can take 3x.
- The wilder the work, the worse the single number: 32% on time for familiar work, 5% for a new domain.
- A flat 20% buffer is right only by luck: far too much for familiar work (99%), far too little for new work (18%). It doesn't know your spread.
- A P85 date holds close to 85% at every spread, because it's built from the spread.
- A range is only as good as its spread. Guess blow-ups at half their size and the "85%" date is a coin flip (49.6%). The spread has to come from history, not from a feeling.
- Counting finished items per week needs no estimates and gives a calibrated date: P85 met 89.7%.

## Limits

- Synthetic: one backlog, one blow-up model, no real team data. The model (right-skewed, median on estimate) is the one in Bernhardsson's post; the sigmas are chosen, not measured.
- Perfect parallel work and a fixed scope. Real projects add waiting, dependencies and scope growth, which push every plan later.
- Tasks blow up independently. In real projects they often blow up together (the same wrong assumption under five tasks), which widens the range further.
- The throughput history comes from the same kind of work as the backlog. If the next feature is unlike the last 12 weeks, so is the forecast.
- Week rounding makes the throughput P85 slightly conservative (89.7% instead of 85%).

## Sources

- Erik Bernhardsson, "Why software projects take longer than you think: a statistical model" (2019)
- Daniel Vacanti, *When Will It Be Done?* (2020)
- Troy Magennis, *Forecasting and Simulating Software Development Projects* (2011)
