# 05 - Does an AI reviewer catch silent failures?

Teams put an AI reviewer on every pull request. This lab checks what it catches on 20 small PRs against a toy order service: 10 each carry one seeded silent failure, and 10 are the same features done right.

A silent failure here does the wrong thing while returning success. It raises no error and **passes the existing tests**, which all 20 PRs do.

The seeded bugs are not textbook ones (no bare `except: pass`, no missing lock in plain sight). Each diff looks correct on its own and breaks only because of a rule written in another file: a docstring contract, a config default, a caller that relies on an exception, a unit in a constant's comment. That is how these bugs get past a careful human reviewer. The reviewer can open every file, so nothing it needs is hidden.

- `service/`: the order service under review (Python). GBP in integer pence, the Cambridge example address, statuses ending in `DELIVERED`. It has a primary store whose reads return copies, like database rows, plus a lagging read model of courier chains for the dispatcher screen, chaining of orders onto couriers already on a trip, a payment client (charges deduped by idempotency key, refunds not), SMS with a retry outbox, feature flags and zone config.
- `prs.py`: the 20 PRs as edits to `service/`, each with a title and description written the way a developer would. Each has an answer key (what breaks and where the rule lives, or why the twin is fine) and its twin. Reviewers never see the key; the judge does.
- `check_bugs.py`: runs the same scenario on each bug and its twin, which proves every bug is real and every twin is not.
- `review.py`: runs each reviewer on each PR, 3 times. Each run gets a fresh git repo (`main` plus branch `pr`). Claude Code runs headless with `--bare`, so no hooks, CLAUDE.md, memory or MCP, and with read-only tools (`Read`, `Grep`, `Glob`, `git diff/show/log`).
- `grade.py`: a judge model grades each review against the answer key, then prints the table. Grades are saved next to each review (`runs/<reviewer>/<pr>/run<k>.grade.json`) for spot-checking.

```bash
# ANTHROPIC_API_KEY must be set in your shell (profile or keychain), never in a file here
python3 check_bugs.py      # each bug vs its twin, no API calls
python3 review.py          # 2 reviewers x 20 PRs x 3 runs = 120 reviews; resumes if interrupted
python3 grade.py           # judge + table, writes summary.json
RUNS=1 PRS=b01-swallowed-notify,c09-guest-sms-best-effort python3 review.py   # quick try
MODEL=... JUDGE_MODEL=... python3 review.py                                    # defaults: claude-sonnet-5-5, judge claude-opus-5-5
```

## The PRs and proof

`python3 check_bugs.py`, the same scenario on each bug and its clean twin:

| # | Bug PR (diff looks fine) | The rule it breaks, in another file | Scenario | Bug | Twin |
|---|---|---|---|---|---|
| 01 | Read courier chains from the courier view (cuts primary reads) | `views.py`: the view lags; display only, decisions read the store | Order moved from courier_7 to courier_9, new order next door | chained to courier_7 | courier_9 |
| 02 | Retry transient errors in `Http.post` | `payments.py`: refunds take no idempotency key | Refund times out after the provider applied it | 2 refunds | 1 |
| 03 | Apply the promo to what the guest pays | `money.py`: promos apply to the item subtotal only | 10% on a 1199p pizza, 499p delivery | 169p off | 119p |
| 04 | Kitchen summary for one day | `models.py` UTC timestamps, `reports.py` London days | Order at 00:30 London, 2 July | 0 orders | 1 |
| 05 | `Notifier.send` returns a status instead of raising | `service.dispatch` queues for retry only on `NotifyError` | SMS provider down at dispatch | 0 queued | 1 |
| 06 | `CardExpired` exception for the app | `place_order` cleans up only on `PaymentError` | Expired card | order stuck CREATED, 5 items reserved | PAYMENT_FAILED, 0 |
| 07 | Zone config: `free_over_pence: int = 0` | `money.delivery_fee`: None = no offer, a number = threshold | CB4 (no offer), 2695p basket | fee 0p | 499p |
| 08 | Rename flag `surge_fee` at the call site | `flags.py`: unknown flag reads as off | CB4 with surge on | 349p | 499p |
| 09 | `pick_up` records pickup time | `store.py`: `get` returns a copy | Pickup at 11:00 | stored: None | 11:00 |
| 10 | Limit chain spread from the first order | `geo.distance` is km, `MAX_DETOUR` is metres | New order 1.4 km from the first (limit 800 m) | chained | not chained |

01 is the story behind the article: a courier was handed an order on a trip they were no longer on, because chaining read a stale view of the chain.

## Reviewers and levels

1. **Default prompt**: the generic review prompt teams start with. It follows the Claude Code GitHub Action's example review workflow: code quality, potential bugs, performance, security, test coverage.
2. **Checklist prompt**: only silent failures, and read what the change depends on outside the diff first (callers, docstrings, config, flags). It checks swallowed errors, retry idempotency, defaults, time, money, concurrency, ignored return values, multi-step writes and health checks. Each finding is tagged `[BLOCKING]` or `[NIT]`, and style is ignored.
3. **Checklist, blocking only**: level 2's output with only `[BLOCKING]` comments posted (a severity bar). No extra run.

Measured per level: silent failures caught (of 10), false alarms per clean PR, comments per PR, cost per PR. Cost is also shown per month at 20, 100 and 500 PRs a week (review cost only, API list price as billed by Claude Code). Each is shown as the mean over 3 runs, with the range in brackets.

**What counts.** A bug is caught when a comment names it or its concrete effect. A false alarm is a comment on a clean PR claiming a defect that isn't real; style and test suggestions don't count.

## Limits

- The PRs are small and the service is a toy. Real PRs are bigger, the rule they break can sit in another repo or in someone's head, and the reviewer can't see that. Real catch rates are likely lower, not higher.
- The judge is a model too. Spot-check the `.grade.json` files before publishing, and correct any wrong grade by hand (and say so here).
- One model per reviewer, on the date of the run. Results change with models and prompts; the numbers are a snapshot, not a ranking of tools.
- Model answers vary, so there are 3 runs per PR. Publish the ranges, not one number.

## Pilot (2026-11-06, discarded)

One run of b01 and its first twin, both reviewers. Both reviewers caught b01 as blocking. Both also flagged the first twin, which shortlisted couriers from the lagging view: that was a fair catch (it could silently skip a courier), so the twin was replaced with c01 (filter in the store). The pilot also showed two flaws in the base service that drew comments on every PR: nothing ran the view's background job, and `service.chain` didn't catch `ConflictError`. Both are fixed (`jobs.py`, `app.py`). Cost: $0.045 to $0.051 per review (claude-sonnet-5-5, 3 to 5 turns). These runs are not part of the results.

## Results

Not run yet.
