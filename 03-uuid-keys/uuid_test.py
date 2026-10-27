"""What does the primary-key type do to inserts? Load the same rows into one orders table per key
type in a memory-limited PostgreSQL and measure inserts per second, index size, leaf density and WAL.

Usage: python3 uuid_test.py [bigint|v4|v4_ff70|v7|bigint_public_v4|all] [children]
  bigint:           bigint identity, the baseline
  v4:               uuid primary key from gen_random_uuid()
  v4_ff70:          the same, index fillfactor 70 (cheap fix: leave room for inserts)
  v7:               uuid primary key from uuidv7()
  bigint_public_v4: bigint primary key plus a random uuid column with a unique index (public ID)
  children:         after the load, fill a child table that repeats the order id with its own index
Environment: ROWS (default 10000000), BATCH (250000), MEM (container limit, 512m),
SHARED_BUFFERS (128MB), PG_IMAGE (postgres:18).
Each variant runs in a fresh container, so no variant starts with another one's cache.
Needs Docker; standard library only (Python 3.12+). Timings depend on the machine: see the README.
"""
import os
import subprocess
import sys
import time

ROWS = int(os.environ.get("ROWS", 10_000_000))
BATCH = int(os.environ.get("BATCH", 250_000))
MEM = os.environ.get("MEM", "512m")
SHARED_BUFFERS = os.environ.get("SHARED_BUFFERS", "128MB")
IMAGE = os.environ.get("PG_IMAGE", "postgres:18")
CONTAINER = "uuid-lab"
CHILD_ORDERS = 1_000_000   # orders whose status history goes into the child table
STATUSES = ("PLACED", "PAID", "DELIVERED")

ADDRESS = "Anglia Ruskin University, East Rd, Cambridge CB1 1PT"

# variant -> (primary key column, extra columns, statements run after CREATE TABLE)
VARIANTS = {
    "bigint": ("id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY", "", ()),
    "v4": ("id uuid DEFAULT gen_random_uuid() PRIMARY KEY", "", ()),
    "v4_ff70": ("id uuid DEFAULT gen_random_uuid()", "",
                ("ALTER TABLE orders ADD PRIMARY KEY (id) WITH (fillfactor = 70)",)),
    "v7": ("id uuid DEFAULT uuidv7() PRIMARY KEY", "", ()),
    "bigint_public_v4": ("id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY",
                         ", public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE", ()),
}


def sh(*args, check=True, **kwargs):
    return subprocess.run(args, check=check, capture_output=True, text=True, **kwargs)


def psql(sql):
    """Run SQL in the container, return stdout (unaligned, tuples only)."""
    result = sh("docker", "exec", CONTAINER, "psql", "-U", "postgres", "-qAtX", "-v", "ON_ERROR_STOP=1", "-c", sql)
    return result.stdout.strip()


def start_container():
    sh("docker", "rm", "-f", "-v", CONTAINER, check=False)
    sh("docker", "run", "-d", "--name", CONTAINER, "--memory", MEM, "--memory-swap", MEM,
       "-e", "POSTGRES_PASSWORD=lab", IMAGE,
       "-c", f"shared_buffers={SHARED_BUFFERS}", "-c", "max_wal_size=4GB", "-c", "checkpoint_timeout=15min",
       "-c", "synchronous_commit=on", "-c", "autovacuum=off")
    for _ in range(60):
        time.sleep(1)
        if sh("docker", "exec", CONTAINER, "pg_isready", "-U", "postgres", check=False).returncode == 0:
            time.sleep(2)  # the image restarts once after init
            if sh("docker", "exec", CONTAINER, "pg_isready", "-U", "postgres", check=False).returncode == 0:
                return
    sys.exit("postgres did not start")


def machine():
    print("== machine")
    print(sh("docker", "version", "--format", "docker {{.Server.Version}}").stdout.strip())
    print(psql("SELECT version()"))
    print(f"container limit {MEM}, shared_buffers {SHARED_BUFFERS}, rows {ROWS:,}, batch {BATCH:,}")


def lsn():
    return int(psql("SELECT pg_current_wal_lsn() - '0/0'::pg_lsn"))


def run_variant(name, children):
    pk, extra, after = VARIANTS[name]
    start_container()
    psql("CREATE EXTENSION pgstattuple")
    psql(f"CREATE TABLE orders ({pk}, status text NOT NULL, total_pence int NOT NULL, "
         f"placed_at timestamptz NOT NULL, address text NOT NULL{extra})")
    for statement in after:
        psql(statement)
    psql("CHECKPOINT")

    wal_start, fpi_start = lsn(), int(psql("SELECT wal_fpi FROM pg_stat_wal"))
    print(f"== {name}")
    print("rows,inserts_per_s")
    done, first_rate, last_rate, started = 0, None, None, time.perf_counter()
    report_every = max(BATCH, ROWS // 10)
    window_rows, window_s = 0, 0.0
    while done < ROWS:
        n = min(BATCH, ROWS - done)
        t = time.perf_counter()
        psql(f"INSERT INTO orders (status, total_pence, placed_at, address) "
             f"SELECT 'PLACED', 1199 + g % 2000, now(), '{ADDRESS}' FROM generate_series(1, {n}) g")
        window_s += time.perf_counter() - t
        window_rows += n
        done += n
        if done % report_every == 0 or done == ROWS:
            rate = window_rows / window_s
            first_rate = first_rate or rate
            last_rate = rate
            print(f"{done},{rate:.0f}")
            window_rows, window_s = 0, 0.0
    load_s = time.perf_counter() - started
    psql("CHECKPOINT")
    wal = lsn() - wal_start
    fpi = int(psql("SELECT wal_fpi FROM pg_stat_wal")) - fpi_start

    index = "orders_pkey"
    stat = psql(f"SELECT avg_leaf_density, leaf_fragmentation FROM pgstatindex('{index}')").split("|")
    sizes = psql("SELECT pg_relation_size('orders'), pg_relation_size('orders_pkey')").split("|")
    print(f"load_s {load_s:,.0f}  first_window {first_rate:,.0f}/s  last_window {last_rate:,.0f}/s  "
          f"last/first {last_rate / first_rate:.2f}")
    print(f"table_mb {int(sizes[0]) / 2**20:,.0f}  pkey_mb {int(sizes[1]) / 2**20:,.0f}  "
          f"pkey_bytes_per_row {int(sizes[1]) / ROWS:.1f}  leaf_density {float(stat[0]):.1f}%  "
          f"leaf_fragmentation {float(stat[1]):.1f}%")
    if name == "bigint_public_v4":
        public = psql("SELECT pg_relation_size('orders_public_id_key'), "
                      "(SELECT avg_leaf_density FROM pgstatindex('orders_public_id_key'))").split("|")
        print(f"public_id_index_mb {int(public[0]) / 2**20:,.0f}  public_id_leaf_density {float(public[1]):.1f}%")
    print(f"wal_mb {wal / 2**20:,.0f}  wal_bytes_per_row {wal / ROWS:,.0f}  full_page_images {fpi:,}  "
          f"fpi_per_1k_rows {fpi / ROWS * 1000:.1f}")

    if children:
        run_children(name)
    sh("docker", "rm", "-f", "-v", CONTAINER, check=False)


def run_children(name):
    key = "bigint" if name.startswith("bigint") else "uuid"
    values = ", ".join(f"('{s}')" for s in STATUSES)
    psql(f"CREATE TABLE order_status_history (order_id {key} NOT NULL, status text NOT NULL, "
         f"at timestamptz NOT NULL DEFAULT now())")
    psql("CREATE INDEX ON order_status_history (order_id)")
    orders = min(CHILD_ORDERS, ROWS)
    t = time.perf_counter()
    psql(f"INSERT INTO order_status_history (order_id, status) "
         f"SELECT o.id, s.status FROM (SELECT id FROM orders LIMIT {orders}) o CROSS JOIN (VALUES {values}) s(status)")
    child_s = time.perf_counter() - t
    sizes = psql("SELECT pg_relation_size('order_status_history'), pg_relation_size('order_status_history_order_id_idx')").split("|")
    print(f"child ({orders:,} orders x {len(STATUSES)} statuses): load_s {child_s:,.1f}  "
          f"table_mb {int(sizes[0]) / 2**20:,.0f}  index_mb {int(sizes[1]) / 2**20:,.0f}")


def main():
    args = sys.argv[1:]
    children = "children" in args
    names = [a for a in args if a != "children"] or ["all"]
    if names == ["all"]:
        names = list(VARIANTS)
    for name in names:
        if name not in VARIANTS:
            sys.exit(f"unknown variant {name!r}; choose from {', '.join(VARIANTS)}, all")
    start_container()
    machine()
    for name in names:
        run_variant(name, children)


if __name__ == "__main__":
    main()
