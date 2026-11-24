# 09 - Who pays for the refill?

Article: (pending)

One menu API (`GET /menu`) behind Redis, reading PostgreSQL 18. The menu is one store's: 14 categories, 220 items with sizes, 60 modifier groups (4 to 10 options each), availability across 50 stores; about 350 KB of JSON, 23 KB gzipped, prices in GBP pence. A steady open-loop load reads the menu at 200 requests a second. After 20 s, staff edit one price; the load runs 40 s more. The question: who pays for the rebuild after the edit?

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
RPS=100 WARM=8 AFTER=12 .venv/bin/python cold_cache_test.py all   # quick check
.venv/bin/python scale.py summary.json                        # day model: monthly vs daily edits
```

Needs Docker and Python 3.12+. PostgreSQL (limited to 1 CPU) and Redis (0.5 CPU) run in containers on 127.0.0.1 with a throwaway password generated per run; the API (`server.py`, a thread per request, 20 database connections, 5 s to get one) and the load generator run on the host. Each strategy gets a fresh API process and an empty cache, warmed with one read before the load starts.

## What is measured

- The build alone, on an idle system: 20 timed uncached builds.
- After the edit: rebuilds started and how many ran at once, queries active in PostgreSQL (sampled every 10 ms), and how each request was served: `hit`, `miss` (built it), `wait` (waited for another reader's build), `stale` (got the old menu), or failed (`error` = no database connection in 5 s, `timeout` = no answer in 10 s).
- Requests that waited for a rebuild, how long the cold window lasted, their latency, and responses still carrying the old menu version (how stale, for how long).
- Latency before the edit and in the 5 s after it, from each request's scheduled send time (open loop, so queueing is not hidden).

Counts (rebuilds, requests that waited) depend on the read rate and the build time; times depend on the machine.

## Results

Pending: AWS EC2 t3.small, eu-central-1, two runs per build.
