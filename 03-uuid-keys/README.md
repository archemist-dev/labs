# 03 - What does the primary-key type do to inserts?

One `orders` table (id, status, total in pence, placed_at, address; about 100 bytes a row, narrow on purpose so the index outgrows memory sooner) loaded with the same rows for each key type, in a PostgreSQL 18 container with a memory limit. Rows are inserted by SQL (`INSERT ... SELECT generate_series`), 250,000 per statement, so the key generator is the only difference between variants.

| Variant | Key |
| --- | --- |
| `bigint` | `bigint` identity (baseline) |
| `v4` | `uuid` from `gen_random_uuid()` |
| `v4_ff70` | the same, primary key index at fillfactor 70 (cheap fix) |
| `v7` | `uuid` from `uuidv7()` |
| `bigint_public_v4` | `bigint` primary key plus a random `uuid` column with a unique index (public ID) |

```bash
python3 uuid_test.py all children     # every variant, then the child table
python3 uuid_test.py v7               # one variant
ROWS=1000000 MEM=256m python3 uuid_test.py all   # smaller or tighter
```

Standard library only (Python 3.12+); needs Docker. Each variant starts a fresh container (`--memory` and `--memory-swap` set to `MEM`, `shared_buffers` to `SHARED_BUFFERS`), so the page cache is limited too and no variant inherits another's cache. Defaults: 10M rows, `MEM=512m`, `SHARED_BUFFERS=128MB`: the random-key index (about 0.4 GB) plus the table no longer fit.

## What is measured

- **Inserts per second** per window of the load (first window against last window shows the slowdown).
- **Primary key index size** and **bytes per row**, **average leaf density** and **leaf fragmentation** (`pgstatindex`).
- **WAL bytes per row** and **full-page images** (a random key touches old pages, each first touch after a checkpoint logs a whole page).
- **Child table** (`order_status_history`: 3 statuses for the first 1M orders, its own index on `order_id`): index size with an 8-byte against a 16-byte key.

Not measured: reads, joins, update-heavy workloads, concurrent inserts.

## Results (2026-10-27)

AWS EC2 t3.small, eu-central-1, Intel Xeon Platinum 8259CL @ 2.50GHz, 2 vCPU, 2 GB, 20 GB gp3 (3,000 IOPS), Ubuntu 26.04.1 LTS, Docker 29.1.3, PostgreSQL 18.6 (`postgres:18`, digest in the log). Postgres container limited to 512 MB, `shared_buffers` 128 MB, 10M rows. Raw log: [results-ec2-t3small-2026-10-27.txt](results-ec2-t3small-2026-10-27.txt).

Runs 1 and 2: every variant. Sizes, WAL and full-page images matched exactly; timings for bigint and v4 matched within 5%, v7 did not (90 s and 59 s), so runs 3 and 4 repeated v4 and v7. Reference numbers below are run 1 (inside the range of the other runs for every variant).

| Variant | Load 10M rows | First window | Last window (9-10M rows) | Primary key | Bytes per row | Leaf density | WAL per row | Full-page images | Child index (3M rows) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bigint | 58 s | 261k/s | 204k/s | 214 MB | 22.5 | 90% | 214 B | 45 | 47 MB |
| v7 | 90 s | 183k/s | 93k/s | 301 MB | 31.5 | 90% | 228 B | 49 | 56 MB |
| v4 | 391 s | 126k/s | 6.6k/s | 389 MB | 40.8 | 70% | 269 B | 45,128 | 72 MB |
| v4, fillfactor 70 | 514 s | 108k/s | 4.0k/s | 384 MB | 40.2 | 71% | 269 B | 46,031 | 73 MB |
| bigint + public v4 | 410 s | 101k/s | 7.2k/s | 214 MB + 384 MB | 22.5 + 40.2 | 90% / 71% | 340 B | 35,732 | 47 MB |

Load time across runs (seconds):

| Variant | Run 1 | Run 2 | Run 3 | Run 4 |
| --- | --- | --- | --- | --- |
| bigint | 58 | 56 | | |
| v7 | 90 | 59 | 85 | 89 |
| v4 | 391 | 398 | 384 | 375 |
| v4, fillfactor 70 | 514 | 395 | | |
| bigint + public v4 | 410 | 466 | | |

## Reading it

- **v4 took 4.3x longer than v7 to load 10M rows** (391 s against 90 s; 4.2x to 6.7x across runs). At the end of the load, v4 inserted 14x slower (6.6k/s against 93k/s): its index no longer fit in memory, so most inserts first read a random page from disk.
- **v7 slows too** (last window about half the first) once the table outgrows memory, but gradually; v4 falls to 5% of its starting rate.
- **Lowering fillfactor doesn't help a random key.** Random inserts split full pages 50/50 whatever the setting, so leaves end about 70% full either way; fillfactor only shapes index builds and right-edge splits. Run 1 was slower, run 2 the same.
- **A bigint key with a random public ID keeps the problem.** The primary key stays tidy, but the unique index on the random column scatters inserts the same way, and the row writes two indexes (most WAL per row).
- **Size:** at the same 16 bytes, the v4 index is 29% bigger than v7 (half-empty pages). bigint is the smallest; every table that repeats the key pays the difference again (child index 47 / 56 / 72 MB).
- **WAL:** random keys touch old pages after every checkpoint, each first touch writes a whole 8 KB page: about 45,000 full-page images against 49 for v7.

Not measured: reads, concurrent inserts from many clients, update-heavy tables. A smaller table, or more memory, hides the cliff until the index outgrows memory.
