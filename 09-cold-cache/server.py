"""The menu API: GET /menu behind a Redis cache, with one of four ways to handle a menu edit.

Usage: python3 server.py STRATEGY [PORT]
  delete         the edit deletes the key; the next readers find it empty and each rebuilds (cache-aside)
  single_flight  the edit deletes the key; one reader takes a Redis lock and rebuilds, the rest wait for it
  swr            the edit marks the entry stale; readers keep getting the old menu, one background refresh
  publish        the edit builds the new menu and writes it (write-through); readers never rebuild
Endpoints: GET /menu, GET /menu?nocache=1 (one uncached build, for timing), POST /admin/edit, GET /stats.
Environment: PG_HOST, PG_PORT, PG_PASSWORD (set by cold_cache_test.py, a throwaway per run), REDIS_HOST,
REDIS_PORT, WORKERS (processes, 4), POOL_MAX (database connections across all workers, 20), POOL_TIMEOUT
(s to wait for one, 5), LOCK_TTL_MS (10000), WAIT_POLL_MS (25).
Like a small Python app server (gunicorn style): WORKERS forked processes share one listening socket, each
with a thread per request and its own share of the connection pool. Single-flight works at two levels: inside a
process, readers wait on the one in-flight read; across processes, a Redis lock picks the one that builds.
Each response says how it was served (X-Cache: hit, miss = built it, wait = waited for another reader's build,
stale = old menu, error). Every build is logged to Redis, so GET /stats sees all workers.
"""
import json
import os
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg
import redis
from psycopg_pool import ConnectionPool, PoolTimeout

import menu

STRATEGIES = ("delete", "single_flight", "swr", "publish")
PG = {"host": os.environ.get("PG_HOST", "127.0.0.1"), "port": int(os.environ.get("PG_PORT", 55432)),
      "user": "postgres", "dbname": "postgres", "password": os.environ.get("PG_PASSWORD", "")}
WORKERS = int(os.environ.get("WORKERS", 4))
POOL_MAX = int(os.environ.get("POOL_MAX", 20))
POOL_TIMEOUT = float(os.environ.get("POOL_TIMEOUT", 5))
LOCK_TTL_MS = int(os.environ.get("LOCK_TTL_MS", 10_000))
WAIT_POLL = int(os.environ.get("WAIT_POLL_MS", 25)) / 1000
KEY, LOCK, DIRTY, BUILDS = "menu:1", "menu:1:lock", "menu:1:dirty", "lab:builds"

STRATEGY = sys.argv[1] if len(sys.argv) > 1 else "delete"
if STRATEGY not in STRATEGIES:
    sys.exit(f"strategy must be one of {', '.join(STRATEGIES)}")

pool = admin = cache = None  # created in each worker after the fork
admin_lock = threading.Lock()
flight_lock, flight = threading.Lock(), {}


def connect():
    global pool, admin, cache
    size = max(1, POOL_MAX // WORKERS)
    pool = ConnectionPool(kwargs=PG, min_size=size, max_size=size, timeout=POOL_TIMEOUT, open=True)
    admin = psycopg.connect(**PG)  # the admin panel's own connection, so an edit never queues behind readers
    cache = redis.Redis(host=os.environ.get("REDIS_HOST", "127.0.0.1"),
                        port=int(os.environ.get("REDIS_PORT", 56379)), socket_timeout=5)


def build(kind, conn=None):
    """Run the uncached build and record when it ran. kind: reader, background or publish."""
    start = time.time()
    if conn is None:
        with pool.connection() as c:
            version, body = menu.build(c)
    else:
        version, body = menu.build(conn)
    cache.rpush(BUILDS, json.dumps({"kind": kind, "start": start, "end": time.time(), "version": version,
                                    "pid": os.getpid()}))
    return version, body


def pack(version, body):
    return b"%d\n" % version + body


def unpack(value):
    head, body = value.split(b"\n", 1)
    return int(head), body


def rebuild_and_store(kind):
    version, body = build(kind)
    cache.set(KEY, pack(version, body))
    return version, body


class Flight:
    def __init__(self):
        self.done = threading.Event()
        self.result = None


def read_single_flight():
    """Inside this process, the first reader leads and the rest wait on its result without touching Redis."""
    with flight_lock:
        current = flight.get(KEY)
        leader = current is None
        if leader:
            current = flight[KEY] = Flight()
    if not leader:
        if current.done.wait(LOCK_TTL_MS / 1000 + 1) and current.result is not None:
            return "wait", *current.result
        raise RuntimeError("in-flight read failed")
    try:
        how, version, body = read_across_workers()
        current.result = (version, body)
        return how, version, body
    finally:
        with flight_lock:
            flight.pop(KEY, None)
        current.done.set()


def read_across_workers():
    """One worker rebuilds under a Redis lock; the other workers' leaders poll the key until it is back."""
    token = uuid.uuid4().hex
    if cache.set(LOCK, token, nx=True, px=LOCK_TTL_MS):
        try:
            return "miss", *rebuild_and_store("reader")
        finally:
            if cache.get(LOCK) == token.encode():
                cache.delete(LOCK)
    deadline = time.time() + LOCK_TTL_MS / 1000
    while time.time() < deadline:
        time.sleep(WAIT_POLL)
        value = cache.get(KEY)
        if value is not None:
            return "wait", *unpack(value)
    return "miss", *rebuild_and_store("reader")  # the lock holder died: build it yourself


def refresh_in_background():
    try:
        rebuild_and_store("background")
        cache.delete(DIRTY)
    finally:
        cache.delete(LOCK)


def read_menu():
    """Returns (how it was served, version, gzipped body)."""
    if STRATEGY == "delete":
        value = cache.get(KEY)
        if value is None:
            return "miss", *rebuild_and_store("reader")
        return "hit", *unpack(value)
    if STRATEGY == "swr":
        value, dirty = cache.mget(KEY, DIRTY)
        if value is None:
            return read_single_flight()
        if dirty is not None:
            if cache.set(LOCK, "bg", nx=True, px=LOCK_TTL_MS):
                threading.Thread(target=refresh_in_background, daemon=True).start()
            return "stale", *unpack(value)
        return "hit", *unpack(value)
    value = cache.get(KEY)  # single_flight and publish
    if value is None:
        return read_single_flight()
    return "hit", *unpack(value)


def edit_menu():
    """The staff edit, then what this strategy does to the cache. Returns timings and the new version."""
    with admin_lock:
        t_edit = time.time()
        version = menu.edit(admin)
        if STRATEGY in ("delete", "single_flight"):
            cache.delete(KEY)
        elif STRATEGY == "swr":
            cache.set(DIRTY, "1")
        else:
            v, body = build("publish", admin)
            cache.set(KEY, pack(v, body))
        return {"version": version, "t_edit": t_edit, "t_done": time.time()}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, code, body, headers=()):
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/menu":
            try:
                how, version, body = read_menu()
            except (PoolTimeout, psycopg.OperationalError, redis.RedisError, RuntimeError) as e:
                return self.reply(503, type(e).__name__.encode(), [("X-Cache", "error")])
            return self.reply(200, body, [("Content-Type", "application/json"), ("Content-Encoding", "gzip"),
                                          ("X-Cache", how), ("X-Menu-Version", str(version))])
        if self.path == "/menu?nocache=1":
            start = time.perf_counter()
            with pool.connection() as c:
                _, body = menu.build(c)
            ms = (time.perf_counter() - start) * 1000
            return self.reply(200, body, [("X-Build-Ms", f"{ms:.2f}"), ("Content-Encoding", "gzip")])
        if self.path == "/stats":
            raw, _ = cache.pipeline().lrange(BUILDS, 0, -1).delete(BUILDS).execute()
            out = json.dumps({"builds": [json.loads(b) for b in raw]}).encode()
            return self.reply(200, out, [("Content-Type", "application/json")])
        self.reply(404, b"not found")

    def do_POST(self):
        if self.path == "/admin/edit":
            return self.reply(200, json.dumps(edit_menu()).encode(), [("Content-Type", "application/json")])
        self.reply(404, b"not found")


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 4096


if __name__ == "__main__":
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    listener = Server(("127.0.0.1", port), Handler)  # bound once, before the fork; every worker accepts on it
    print(f"menu API, strategy {STRATEGY}, port {port}, {WORKERS} workers", flush=True)
    children = []
    for _ in range(WORKERS):
        pid = os.fork()
        if pid == 0:
            connect()
            listener.serve_forever()
            os._exit(0)
        children.append(pid)
    for pid in children:  # stopped by a signal to the whole process group (cold_cache_test.py)
        os.waitpid(pid, 0)
