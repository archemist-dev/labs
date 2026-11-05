# 05 - Does an AI reviewer catch silent failures?

Teams put an AI reviewer on every pull request. This lab checks what it catches. It runs on 20 small PRs against a toy order service: 10 each carry one seeded silent failure, and 10 are clean.

A silent failure here is a change that does the wrong thing while returning success. It raises no error and **passes the existing tests**, which all 20 PRs do.

- `service/`: the order service under review (Python). GBP in integer pence, the Cambridge example address, statuses ending in `DELIVERED`, a payment client whose provider dedupes by idempotency key, a store with compare-and-set status updates.
- `prs.py`: the 20 PRs as edits to `service/`, each with a title and description written the way a developer would. Each one has an answer key: the seeded bug, or what looks odd but is intended. Reviewers never see the key; the judge does.
- `review.py`: runs each reviewer on each PR, 3 times. Each run gets a fresh git repo (`main` plus branch `pr`). Claude Code runs headless with `--bare`, which means no hooks, no CLAUDE.md, no memory and no MCP, and with read-only tools (`Read`, `Grep`, `Glob`, `git diff/show/log`).
- `grade.py`: a judge model grades each review against the answer key, then prints the table. Grades are saved next to each review (`runs/<reviewer>/<pr>/run<k>.grade.json`) for spot-checking.

```bash
# ANTHROPIC_API_KEY must be set in your shell (profile or keychain), never in a file here
python3 review.py          # 2 reviewers x 20 PRs x 3 runs = 120 reviews; resumes if interrupted
python3 grade.py           # judge + table, writes summary.json
RUNS=1 PRS=b01-swallowed-notify,c09-guest-sms-best-effort python3 review.py   # quick try
MODEL=... JUDGE_MODEL=... python3 review.py                                    # defaults: claude-sonnet-5-5, judge claude-opus-5-5
```

## The PRs

| Seeded silent failure | | Clean control (some look suspicious on purpose) | |
|---|---|---|---|
| b01 | Courier notify error caught and logged, dispatch "succeeds" | c01 | Extract pricing method (pure refactor) |
| b02 | Charge retried with a new idempotency key each time | c02 | Type hints |
| b03 | Missing zone fee defaults to 0, unknown zones accepted | c03 | Cancel with compare-and-set, checked refund, `except: log; raise` |
| b04 | Last-order hour compared in UTC, not London time | c04 | Charge retried with the same idempotency key |
| b05 | Discount through a float, `int()` drops a penny | c05 | Paused promo (`percent: null`) applies no discount |
| b06 | Cancel does read, check, `save` (no compare-and-set) | c06 | Last-order hour per kitchen, still London time |
| b07 | Kitchen reject ignores the refund result | c07 | Discount in basis points, integer math |
| b08 | Stock reserved, never released when the charge is declined | c08 | Test only |
| b09 | `/health` returns 200 "ok" while the store is down | c09 | Guest SMS is best effort, failure logged, courier notify still raises |
| b10 | `except Exception` treats a timeout (unknown outcome) as declined | c10 | Kitchen open until 23:00 (business change, test updated) |

## Reviewers and levels

1. **Default prompt**: the generic review prompt teams start with. It follows the Claude Code GitHub Action's example review workflow: code quality, potential bugs, performance, security, test coverage.
2. **Checklist prompt**: only silent failures. It checks swallowed errors, retry idempotency, defaults, time, money, concurrency, ignored return values, multi-step writes and health checks. Each finding is tagged `[BLOCKING]` or `[NIT]`, and style is ignored.
3. **Checklist, blocking only**: level 2's output with only `[BLOCKING]` comments posted (a severity bar). No extra run.

Measured per level: silent failures caught (of 10), false alarms per clean PR, comments per PR, cost per PR. Each is shown as the mean over 3 runs, with the range in brackets.

**What counts.** A bug is caught when a comment names it or its concrete effect. A false alarm is a comment on a clean PR claiming a defect that isn't real; style and test suggestions don't count.

## Limits

- The PRs are small and the service is a toy. Real PRs are bigger and carry context the reviewer can't see. That likely makes real catch rates lower, not higher.
- The judge is a model too. Spot-check the `.grade.json` files before publishing, and correct any wrong grade by hand (and say so here).
- One model per reviewer, on the date of the run. Results change with models and prompts; the numbers are a snapshot, not a ranking of tools.
- Model answers vary, so there are 3 runs per PR. Publish the ranges, not one number.

## Results

Not run yet.
