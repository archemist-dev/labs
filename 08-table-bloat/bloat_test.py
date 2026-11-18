"""Does one slow read make a busy table grow? Run a steady UPDATE load on an orders table while one
session holds an old snapshot, and measure table and index size, dead rows and what typical queries read.

Usage: python3 bloat_test.py [variant ...|all]
  baseline:            updates only, nothing holds a snapshot
  long_report:         a report query runs on the primary for HOLD seconds (the slow admin search)
  idle_tx:             a session opens a transaction, reads once, then sits idle for HOLD seconds
  report_timeout:      long_report with statement_timeout (the report is cancelled)
  idle_timeout:        idle_tx with idle_in_transaction_session_timeout (the session is closed)
  replica_feedback:    the report runs on a streaming replica with hot_standby_feedback on
  replica_no_feedback: the same with hot_standby_feedback off (the replica cancels the report instead)
Environment: ROWS (1000000), RATE (updates per second, 500), WARM (s before the hold, 60), HOLD (600),
AFTER (s after the hold, 180), SAMPLE (s between samples, 60), TIMEOUT (the fix's timeout, 60s),
SHARED_BUFFERS (256MB), PG_IMAGE (postgres:18).
Each variant runs in fresh containers. Needs Docker; standard library only (Python 3.12+).
Sizes and counts are machine-independent; query times depend on the machine: see the README.
"""
import json
import os
import subprocess
import sys
import threading
import time

ROWS = int(os.environ.get("ROWS", 1_000_000))
RATE = int(os.environ.get("RATE", 500))
WARM = int(os.environ.get("WARM", 60))
HOLD = int(os.environ.get("HOLD", 600))
AFTER = int(os.environ.get("AFTER", 180))
SAMPLE = int(os.environ.get("SAMPLE", 60))
TIMEOUT = os.environ.get("TIMEOUT", "60s")
SHARED_BUFFERS = os.environ.get("SHARED_BUFFERS", "256MB")
IMAGE = os.environ.get("PG_IMAGE", "postgres:18")
PRIMARY, REPLICA, NETWORK = "bloat-lab", "bloat-replica", "bloat-net"
PGDATA = "/var/lib/postgresql/data"

ADDRESS = "Anglia Ruskin University, East Rd, Cambridge CB1 1PT"
STATUSES = ("PLACED", "ACCEPTED", "COOKING", "READY", "PICKED_UP", "DELIVERED")
# A tuned busy table: autovacuum looks every 15 s and starts at 2% dead rows (defaults: 1 min, 20%).
SETTINGS = (f"shared_buffers={SHARED_BUFFERS}", "max_wal_size=4GB", "autovacuum_naptime=15s",
            "autovacuum_vacuum_scale_factor=0.02", "track_io_timing=on")

# What the app and the admin panel run while the load goes on, measured by EXPLAIN ANALYZE.
QUERIES = {
    "by_id": "SELECT status, total_pence FROM orders WHERE id = 424242",
    "by_status": "SELECT count(*) FROM orders WHERE status = 'COOKING'",
    "admin_filter": "SELECT count(*) FROM orders WHERE total_pence BETWEEN 2500 AND 2600",
}

# variant -> (where the snapshot is held, how, session settings)
VARIANTS = {
    "baseline": (None, None, ""),
    "long_report": (PRIMARY, "report", ""),
    "idle_tx": (PRIMARY, "idle", ""),
    "report_timeout": (PRIMARY, "report", f"SET statement_timeout = '{TIMEOUT}';"),
    "idle_timeout": (PRIMARY, "idle", f"SET idle_in_transaction_session_timeout = '{TIMEOUT}';"),
    "replica_feedback": (REPLICA, "report", ""),
    "replica_no_feedback": (REPLICA, "report", ""),
}


def sh(*args, check=True, **kwargs):
    return subprocess.run(args, check=check, capture_output=True, text=True, **kwargs)


def psql(sql, container=PRIMARY):
    result = sh("docker", "exec", container, "psql", "-U", "postgres", "-qAtX", "-v", "ON_ERROR_STOP=1", "-c", sql)
    return result.stdout.strip()


def wait_ready(container):
    for _ in range(120):
        time.sleep(1)
        if sh("docker", "exec", container, "pg_isready", "-U", "postgres", check=False).returncode == 0:
            time.sleep(2)  # the image restarts once after init
            if sh("docker", "exec", container, "pg_isready", "-U", "postgres", check=False).returncode == 0:
                return
    sys.exit(f"{container} did not start")


def cleanup():
    sh("docker", "rm", "-f", "-v", REPLICA, PRIMARY, check=False)
    sh("docker", "network", "rm", NETWORK, check=False)


def start_primary():
    cleanup()
    sh("docker", "network", "create", NETWORK)
    args = [a for s in SETTINGS for a in ("-c", s)]
    sh("docker", "run", "-d", "--name", PRIMARY, "--network", NETWORK, "-e", "POSTGRES_PASSWORD=lab",
       "-e", f"PGDATA={PGDATA}", IMAGE, *args)
    wait_ready(PRIMARY)
    sh("docker", "exec", PRIMARY, "bash", "-c", f"echo 'host replication all all scram-sha-256' >> {PGDATA}/pg_hba.conf")
    psql("SELECT pg_reload_conf()")


def start_replica(feedback):
    args = " ".join(f"-c {s}" for s in SETTINGS)
    script = (f"mkdir -p {PGDATA} && chown postgres {PGDATA} && chmod 700 {PGDATA} && "
              f"gosu postgres pg_basebackup -h {PRIMARY} -U postgres -D {PGDATA} -R -X stream && "
              f"exec gosu postgres postgres {args} -c hot_standby_feedback={'on' if feedback else 'off'}")
    sh("docker", "run", "-d", "--name", REPLICA, "--network", NETWORK, "-e", "PGPASSWORD=lab",
       "-e", f"PGDATA={PGDATA}", "--entrypoint", "bash", IMAGE, "-c", script)
    wait_ready(REPLICA)


def load():
    psql("CREATE EXTENSION pgstattuple")
    psql("CREATE TABLE orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, status text NOT NULL, "
         "total_pence int NOT NULL, placed_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, "
         "address text NOT NULL)")
    statuses = "ARRAY[" + ", ".join(f"'{s}'" for s in STATUSES) + "]"
    psql(f"INSERT INTO orders (status, total_pence, placed_at, updated_at, address) "
         f"SELECT ({statuses})[1 + g % {len(STATUSES)}], 1199 + g % 2000, now(), now(), '{ADDRESS}' "
         f"FROM generate_series(1, {ROWS}) g")
    psql("CREATE INDEX orders_status_idx ON orders (status)")
    psql("VACUUM ANALYZE orders")
    psql("CHECKPOINT")


class Updater(threading.Thread):
    """RATE updates per second, one statement per second: an order moves to a random status."""

    def __init__(self):
        super().__init__(daemon=True)
        self.stop = threading.Event()
        self.done = 0
        self.late = 0

    def run(self):
        statuses = "ARRAY[" + ", ".join(f"'{s}'" for s in STATUSES) + "]"
        sql = (f"UPDATE orders SET status = ({statuses})[1 + floor(random() * {len(STATUSES)})::int], "
               f"updated_at = now() WHERE id IN (SELECT 1 + floor(random() * {ROWS})::bigint "
               f"FROM generate_series(1, {RATE}))")
        tick = time.monotonic()
        while not self.stop.is_set():
            psql(sql)
            self.done += RATE
            tick += 1
            wait = tick - time.monotonic()
            if wait > 0:
                self.stop.wait(wait)
            else:
                self.late += 1


class Holder:
    """One session that keeps an old snapshot: a long report, or a transaction left open."""

    def __init__(self, container, kind, settings):
        self.kind = kind
        self.proc = subprocess.Popen(
            ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-qAtX"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if kind == "report":
            body = f"SELECT pg_sleep({HOLD}) FROM (SELECT count(*) FROM orders) report;"
        else:
            body = "BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM orders;"
        self.proc.stdin.write(f"{settings}\n{body}\n")
        self.proc.stdin.flush()

    def release(self):
        try:
            _, err = self.proc.communicate("COMMIT;\n" if self.kind == "idle" else "", timeout=30)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            _, err = self.proc.communicate()
        lines = [line for line in err.strip().splitlines() if line.startswith(("ERROR", "FATAL", "psql:"))]
        return " / ".join(lines) or "ran to the end"


def explain(sql):
    plan = json.loads(psql(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}"))[0]
    top = plan["Plan"]
    pages = top["Shared Hit Blocks"] + top["Shared Read Blocks"]
    return plan["Execution Time"], pages


def sample(t, phase):
    row = psql("SELECT pg_table_size('orders'), pg_indexes_size('orders'), n_live_tup, n_dead_tup, autovacuum_count, "
               "coalesce((SELECT max(age(backend_xmin)) FROM pg_stat_activity), 0) "
               "FROM pg_stat_user_tables WHERE relname = 'orders'").split("|")
    table, index, live, dead, vacuums, horizon = (int(v) for v in row)
    feedback = psql("SELECT coalesce(max(age(backend_xmin)), 0) FROM pg_stat_replication")
    horizon = max(horizon, int(feedback or 0))
    cells = [f"{t}", phase, f"{table / 2**20:.0f}", f"{index / 2**20:.0f}", f"{live}", f"{dead}", f"{vacuums}",
             f"{horizon}"]
    for sql in QUERIES.values():
        ms, pages = explain(sql)
        cells += [f"{ms:.2f}", f"{pages}"]
    print(",".join(cells), flush=True)
    return table, index


def run_variant(name):
    where, kind, settings = VARIANTS[name]
    start_primary()
    load()
    if where == REPLICA:
        start_replica(name == "replica_feedback")
    print(f"== {name}")
    header = ["t_s", "phase", "table_mb", "index_mb", "live", "dead", "autovacuums", "xmin_age_tx"]
    for q in QUERIES:
        header += [f"{q}_ms", f"{q}_pages"]
    print(",".join(header))

    start_table, start_index = sample(0, "start")
    updater = Updater()
    updater.start()
    started = time.monotonic()
    holder, outcome = None, "none"
    end_hold = WARM + HOLD
    total = WARM + HOLD + AFTER
    next_sample = SAMPLE
    while True:
        now = time.monotonic() - started
        if holder is None and kind and now >= WARM and outcome == "none":
            holder = Holder(where, kind, settings)
        if holder is not None and now >= end_hold:
            outcome = holder.release()
            holder = None
        if now >= next_sample:
            phase = "warm" if now < WARM else "hold" if now < end_hold else "after"
            sample(next_sample, phase)
            next_sample += SAMPLE
        if now >= total:
            break
        time.sleep(0.5)
    updater.stop.set()
    updater.join()

    stat = psql("SELECT table_len, tuple_count, dead_tuple_count, free_space FROM pgstattuple('orders')").split("|")
    table_len, tuples, dead, free = (int(v) for v in stat)
    end_index = int(psql("SELECT pg_indexes_size('orders')"))
    print(f"updates {updater.done:,}  late_seconds {updater.late}  snapshot_holder {kind or 'none'} on "
          f"{where or '-'}  outcome: {outcome}")
    print(f"table_mb {start_table / 2**20:.0f} -> {table_len / 2**20:.0f} ({table_len / start_table:.2f}x)  "
          f"indexes_mb {start_index / 2**20:.0f} -> {end_index / 2**20:.0f} ({end_index / start_index:.2f}x)  "
          f"live {tuples:,}  dead {dead:,}  free_space_mb {free / 2**20:.0f}")
    cleanup()


def machine():
    start_primary()
    print("== machine")
    print(sh("docker", "version", "--format", "docker {{.Server.Version}}").stdout.strip())
    print(psql("SELECT version()"))
    print(f"rows {ROWS:,}, rate {RATE}/s, warm {WARM}s, hold {HOLD}s, after {AFTER}s, sample {SAMPLE}s, "
          f"timeout {TIMEOUT}, settings {' '.join(SETTINGS)}")
    cleanup()


def main():
    names = sys.argv[1:] or ["all"]
    if names == ["all"]:
        names = list(VARIANTS)
    for name in names:
        if name not in VARIANTS:
            sys.exit(f"unknown variant {name!r}; choose from {', '.join(VARIANTS)}, all")
    machine()
    try:
        for name in names:
            run_variant(name)
    finally:
        cleanup()


if __name__ == "__main__":
    main()
