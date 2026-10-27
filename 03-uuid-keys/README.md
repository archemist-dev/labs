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

## Results

Not run yet. Reference run: AWS EC2 t3.medium (x86), Ubuntu 24.04, eu-central-1, launched by Javlon, `run-on-vm.sh`, twice; raw log as `results-ec2-t3medium-<date>.txt`.

Smoke tests on a laptop (300,000 rows) check that the script works. They are not results.
