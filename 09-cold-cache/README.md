# 09 - Who pays for the refill?

Article: (pending)

One menu API (`GET /menu`) behind Redis, reading PostgreSQL 18. The menu is one store's: 14 categories, 220 items with sizes, 60 modifier groups (4 to 10 options each), availability across 50 stores; about 350 KB of JSON, 23 KB gzipped, prices in GBP pence. A steady open-loop load reads the menu at 200 requests a second. After 20 s, staff edit one price, and again every 20 s, five edits per run; each edit is measured in its own window and the results give the median and range over the five. The question: who pays for the rebuild after an edit?

| Strategy | What the edit does | Who rebuilds |
| --- | --- | --- |
| `delete` | deletes the key (cache-aside) | every reader that finds it empty |
| `single_flight` | deletes the key | one reader under a Redis lock; the rest wait for it |
| `swr` | marks the entry stale | a background refresh; readers get the old menu meanwhile |
| `publish` | builds the new menu and writes it (write-through) | the edit itself; readers never rebuild |

Two builds of the same menu (`BUILD`), each run with every strategy:

- `orm`: the shape an ORM produces by default: sizes per item, groups per item, options per group (N+1 queries).
- `batched`: one query per table, joined in the app. The cheap fix to the build itself, before any cache change.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python cold_cache_test.py all                       # BUILD=batched by default
BUILD=orm .venv/bin/python cold_cache_test.py delete publish
RPS=100 WARM=6 EDITS=2 EVERY=10 .venv/bin/python cold_cache_test.py all   # quick check
.venv/bin/python scale.py summary.json                        # day model: monthly vs daily edits
```

Needs Docker and Python 3.12+. PostgreSQL (limited to 1 CPU) and Redis (0.5 CPU) run in containers on 127.0.0.1 with a throwaway password generated per run; the API (`server.py`: 4 forked worker processes on one socket, gunicorn style, a thread per request, 5 database connections each, 5 s to get one) and the load generator run on the host. Single-flight waits at two levels: readers inside a worker wait on that worker's one in-flight read; across workers, a Redis lock picks the one that builds. Each strategy gets a fresh API process and an empty cache, warmed with one read before the load starts.

## What is measured

- The build alone, on an idle system: 20 timed uncached builds.
- After the edit: rebuilds (readers that rebuilt the menu), how many were in progress at once (including those still waiting for a database connection) and how many held a connection and built at once, queries active in PostgreSQL (sampled every 10 ms), and how each request was served: `hit`, `miss` (built it), `wait` (waited for another reader's build), `stale` (got the old menu), or failed (`error` = no database connection in 5 s, `timeout` = no answer in 10 s). "Paid" = waited plus failed: the readers who carried the cost of the edit.
- Requests that waited for a rebuild, how long the cold window lasted, their latency, and responses still carrying the old menu version (how stale, for how long).
- Latency before the edit and in the 5 s after it, from each request's scheduled send time (open loop, so queueing is not hidden).

Counts (rebuilds, requests that waited) depend on the read rate and the build time; times depend on the machine.

## Results (2026-11-24)

AWS EC2 t3.small (unlimited credits on), eu-central-1, Intel Xeon Platinum 8259CL @ 2.50GHz, 2 vCPU, 2 GB, Ubuntu 26.04.1 LTS, PostgreSQL 18.7 (`postgres:18`), Redis 8.12.0 (`redis:8`); image digests in the logs. Raw logs: [results-ec2-t3small-2026-11-24.txt](results-ec2-t3small-2026-11-24.txt) (both builds, every strategy, 5 edits per run, two runs) and [results-ec2-t3small-delete10-2026-11-24.txt](results-ec2-t3small-delete10-2026-11-24.txt) (`batched` + `delete`, 10 edits per run, two runs). Summaries: `summary-<build>-run<N>.json`.

A first run on the same day used one API process whose waiting readers each polled Redis every 25 ms; on 2 vCPUs, about 2,000 polling threads starved the one rebuild (14 s instead of 0.3 s), so `single_flight` failed for the wrong reason. Those numbers were discarded and the API changed to the worker model above.

**The build alone** (idle, 20 builds): `orm` 296 ms, `batched` 35 ms (34 to 36 ms across runs). The menu is 356 KB of JSON, 23 KB gzipped. Before any edit, reads take 2.2 ms (p50).

Medians over the edits, run 1 / run 2. "Paid" = readers who waited for a rebuild or failed.

### `orm` build (296 ms), 5 edits per run

| Strategy | Rebuilds per edit | Paid | Failed | Cold window | Paid, p50 | Old menu served |
| --- | --- | --- | --- | --- | --- | --- |
| `delete` | 42 / 41 | 789 / 725 | 748 / 685 | 10.6 / 10.4 s | 5.07 / 5.06 s | 1 / 0 |
| `single_flight` | 1 / 1 | 81 / 84 | 0 | 0.43 / 0.45 s | 215 / 231 ms | 1 / 0 |
| `swr` | 1 / 1 | 0 | 0 | 0 | - | 88 / 88, for 0.44 s |
| `publish` | 1 / 1 | 0 | 0 | 0 | - | 87 / 87, for 0.43 s; the edit takes 435 / 438 ms |

With `delete`, the 20 database connections are all taken by rebuilds, so most readers fail after waiting 5 s for a connection (`error`); about 10 queries run in PostgreSQL at once (its CPU limit). Rebuild counts agree within 3% between runs; paid and failed differ by 8 to 9%, so the article quotes them as a range.

### `batched` build (35 ms)

| Strategy | Rebuilds per edit | Paid | Failed | Cold window | Paid, p50 | Old menu served |
| --- | --- | --- | --- | --- | --- | --- |
| `delete` (10 edits) | 39 / 38.5 | 39 / 38.5 | 0 | 1.5 / 1.5 s | 951 / 890 ms | 0 |
| `single_flight` | 1 / 1 | 14 / 14 | 0 | 0.10 / 0.10 s | 54 / 52 ms | 1 / 0 |
| `swr` | 1 / 1 | 0 | 0 | 0 | - | 14 / 12, for 0.07 / 0.06 s |
| `publish` | 1 / 1 | 0 | 0 | 0 | - | 9 / 13, for 0.04 / 0.06 s; the edit takes 50 / 67 ms |

With `delete`, 19 to 20 readers held a connection and rebuilt at the same moment (all 20 connections). Per edit the count varied from 32 to 77: when rebuilds slow each other down, more readers arrive to an empty cache, so some edits feed on themselves. With 5 edits per run this gave medians of 89 and 40, which did not agree; with 10 edits per run the medians agree (39 and 38.5), and those are the reference.

### Day model (`scale.py`)

Readers per month who paid for a rebuild, at 200 reads/s during every edit, one menu key, every edit clearing the whole menu:

| Build, strategy | 1 edit a month | 1 edit a day | 2 edits a day |
| --- | --- | --- | --- |
| `orm`, `delete` | 725 to 789 | 21,750 to 23,670 | 43,500 to 47,340 |
| `orm`, `single_flight` | 81 to 84 | 2,430 to 2,520 | 4,860 to 5,040 |
| `batched`, `delete` | 39 | 1,155 to 1,170 | 2,310 to 2,340 |
| `batched`, `single_flight` | 14 | 420 | 840 |
| `swr` or `publish`, either build | 0 | 0 | 0 |

Nothing in the code changes between the columns; only the edit rate does.
