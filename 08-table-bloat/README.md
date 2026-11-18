# 08 - Does one slow read make a busy table grow?

Article: (pending)

One `orders` table (1M rows: id, status, total in pence, placed_at, updated_at, address; an index on `status`) in a PostgreSQL 18 container. A steady load moves 500 random orders a second to a new status. After a 60 s warm-up, one session holds an old snapshot for 600 s, then the load runs 180 s more. Autovacuum is tuned for a busy table (`autovacuum_naptime=15s`, `autovacuum_vacuum_scale_factor=0.02`), so in the baseline it keeps up.

| Variant | What holds the snapshot |
| --- | --- |
| `baseline` | nothing |
| `long_report` | a report query on the primary that runs 600 s (the slow admin search) |
| `idle_tx` | a transaction that reads once, then sits idle (a forgotten session) |
| `report_timeout` | `long_report` with `statement_timeout = 60s` |
| `idle_timeout` | `idle_tx` with `idle_in_transaction_session_timeout = 60s` |
| `replica_feedback` | the report on a streaming replica with `hot_standby_feedback = on` |
| `replica_no_feedback` | the same with `hot_standby_feedback = off` |

```bash
python3 bloat_test.py all
python3 bloat_test.py baseline long_report
ROWS=100000 RATE=200 WARM=10 HOLD=40 AFTER=20 SAMPLE=10 TIMEOUT=15s python3 bloat_test.py all   # quick check
```

Standard library only (Python 3.12+); needs Docker. Each variant starts fresh containers.

## What is measured

Every 60 s: table and index size, live and dead rows, autovacuum runs, the age of the oldest snapshot (in transactions), and for three queries (by id, count by status, an admin filter on an unindexed column) the execution time and the pages read (`EXPLAIN (ANALYZE, BUFFERS)`). At the end: exact dead rows and free space (`pgstattuple`), and what happened to the snapshot holder (ran to the end, cancelled by a timeout, or cancelled by a recovery conflict).

Pages read and sizes do not depend on the machine; query times do.

## Results (2026-11-18)

AWS EC2 t3.small (unlimited credits on), eu-central-1, Intel Xeon Platinum 8259CL @ 2.50GHz, 2 vCPU, 2 GB, Ubuntu 26.04.1 LTS, Docker 29.1.3, PostgreSQL 18.7 (`postgres:18`, digest in the logs). Raw logs: [results-ec2-t3small-2026-11-18.txt](results-ec2-t3small-2026-11-18.txt) (every variant, 600 s hold, two runs) and [results-ec2-t3small-hour-2026-11-18.txt](results-ec2-t3small-hour-2026-11-18.txt) (`long_report` with a 3,600 s hold, two runs, and `baseline` over the same length).

Sizes and outcomes matched exactly between runs (within 1 MB). Query times varied up to about 15% between runs and from sample to sample, so pages read are the reference; times are quoted as rough ratios only.

### 10-minute hold (600 s, about 300,000 updates)

| Variant | Table | Indexes | Dead rows at release | Admin filter pages, end | Snapshot holder |
| --- | --- | --- | --- | --- | --- |
| baseline | 120 -> 122 MB | 28 -> 35 MB | about 18,000 (steady) | 15,588 | - |
| long_report | 120 -> 156 MB | 28 -> 51 MB | about 300,000 | 20,000 | ran to the end |
| idle_tx | 120 -> 156 MB | 28 -> 51 MB | about 300,000 | 20,000 | ran to the end |
| report_timeout | 120 -> 124 MB | 28 -> 35 MB | about 17,000 | 15,855 | cancelled: statement timeout |
| idle_timeout | 120 -> 124 MB | 28 -> 35 MB | about 17,000 | 15,855 | closed: idle-in-transaction timeout |
| replica_feedback | 120 -> 157 MB | 28 -> 51 MB | about 300,000 | 20,055 | ran to the end (on the replica) |
| replica_no_feedback | 120 -> 122 MB | 28 -> 35 MB | baseline | 15,581 | cancelled: conflict with recovery |

### 60-minute hold (3,600 s, about 1.8M updates)

| Variant | Table | Indexes | Dead rows at release | Admin filter pages, end | Admin filter, end | Count by status at release |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 120 -> 122 MB | 28 -> 35 MB | about 17,000 (steady) | 15,589 | about 100 ms | about 89 ms |
| long_report (run 1 / run 2) | 120 -> 337 / 336 MB | 28 -> 61 MB | about 1.8M | 43,080 / 43,071 | about 290 / 330 ms | about 820 / 880 ms |

## Reading it

- **One slow read on the primary held cleanup for its whole duration.** Autovacuum ran 35 times in the 10-minute hold and about 240 times in the hour, and could not remove a row version newer than the report's snapshot. The idle transaction did exactly the same as the running report.
- **The table nearly tripled in an hour** (120 to 337 MB, 2.8x; baseline 122 MB), and the indexes grew 2.2x (baseline 1.24x).
- **The bloat stays after the report ends.** Within a minute of the release autovacuum removed the dead rows, but the space is only reusable inside the table file: 210 MB free, the file stays 337 MB, and a full scan reads 2.8x the pages of the baseline (43,080 against 15,589). Shrinking it takes `VACUUM FULL` (locks the table) or `pg_repack`.
- **Timeouts fix it.** A 60 s `statement_timeout` or `idle_in_transaction_session_timeout` kept the table at 124 MB, close to baseline.
- **A replica with `hot_standby_feedback = on` is no fix:** the replica reports its oldest snapshot to the primary, and the primary bloats exactly as if the report ran there (157 MB). With feedback off, the primary stays clean, and the replica cancels the report after `max_standby_streaming_delay` (30 s default) instead.

Not measured: `pg_repack`/`VACUUM FULL` cost, a warehouse, other update rates, HOT-only workloads (the `status` index makes every update non-HOT).
