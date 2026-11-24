"""Who pays for the refill? Steady menu reads behind a Redis cache, one menu edit mid-run, four ways to handle it.

Usage: python3 cold_cache_test.py [strategy ...|all]
  delete, single_flight, swr, publish (see server.py)
Environment: RPS (menu reads per second, 200), WARM (s before the first edit, 20), EDITS (edits per run, 5),
EVERY (s between edits, 20),
CLIENT_TIMEOUT (s, 10), PG_CPUS (1), REDIS_CPUS (0.5), PG_IMAGE (postgres:18), REDIS_IMAGE (redis:8),
OUT (summary file, summary.json), plus BUILD and the menu size (menu.py) and the API settings (server.py).
Each strategy runs on a fresh API and an empty cache, against the same database. Every edit is measured in its
own window (until the next edit); the summary gives the median and the range over the edits. The load is open-loop:
requests go out on schedule whether or not earlier ones came back, and latency counts from the scheduled time.
Counts (rebuilds, requests that waited) depend on the load and the build time; times depend on the machine.
"""
import asyncio
import gzip
import json
import os
import resource
import secrets
import signal
import statistics
import subprocess
import sys
import threading
import time
import urllib.request

import psycopg

import menu

STRATEGIES = ("delete", "single_flight", "swr", "publish")
RPS = int(os.environ.get("RPS", 200))
WARM = int(os.environ.get("WARM", 20))
EDITS = int(os.environ.get("EDITS", 5))
EVERY = int(os.environ.get("EVERY", 20))
CLIENT_TIMEOUT = float(os.environ.get("CLIENT_TIMEOUT", 10))
PG_IMAGE = os.environ.get("PG_IMAGE", "postgres:18")
REDIS_IMAGE = os.environ.get("REDIS_IMAGE", "redis:8")
PG_CPUS = os.environ.get("PG_CPUS", "1")
REDIS_CPUS = os.environ.get("REDIS_CPUS", "0.5")
OUT = os.environ.get("OUT", "summary.json")
PG_PORT, REDIS_PORT, API_PORT = 55432, 56379, 58080
PG_NAME, REDIS_NAME = "cold-cache-pg", "cold-cache-redis"
HERE = os.path.dirname(os.path.abspath(__file__))


def sh(*args, check=True, **kwargs):
    return subprocess.run(args, check=check, capture_output=True, text=True, **kwargs)


def start_containers(env):
    for name in (PG_NAME, REDIS_NAME):
        sh("docker", "rm", "-f", name, check=False)
    # The password is passed by name (-e POSTGRES_PASSWORD), so it never shows on a command line.
    sh("docker", "run", "-d", "--name", PG_NAME, "--cpus", PG_CPUS, "-e", "POSTGRES_PASSWORD",
       "-p", f"127.0.0.1:{PG_PORT}:5432", PG_IMAGE, "-c", "shared_buffers=256MB", "-c", "max_connections=200",
       env=env)
    sh("docker", "run", "-d", "--name", REDIS_NAME, "--cpus", REDIS_CPUS, "-p", f"127.0.0.1:{REDIS_PORT}:6379",
       REDIS_IMAGE, "redis-server", "--save", "", "--appendonly", "no")
    for _ in range(120):
        time.sleep(1)
        try:
            with psycopg.connect(**pg_args(env), connect_timeout=2) as c:
                c.execute("SELECT 1")
            time.sleep(2)  # the image restarts once after init
            with psycopg.connect(**pg_args(env), connect_timeout=2) as c:
                c.execute("SELECT 1")
            return
        except psycopg.OperationalError:
            continue
    sys.exit("postgres did not start")


def stop_containers():
    for name in (PG_NAME, REDIS_NAME):
        sh("docker", "rm", "-f", name, check=False)


def pg_args(env):
    return {"host": "127.0.0.1", "port": PG_PORT, "user": "postgres", "dbname": "postgres",
            "password": env["POSTGRES_PASSWORD"]}


def http(method, path, timeout=30):
    req = urllib.request.Request(f"http://127.0.0.1:{API_PORT}{path}", method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.headers, r.read()


def start_api(strategy, env):
    proc = subprocess.Popen([sys.executable, os.path.join(HERE, "server.py"), strategy, str(API_PORT)],
                            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
                            start_new_session=True)  # its own process group, so one signal stops every worker
    for _ in range(100):
        time.sleep(0.2)
        if proc.poll() is not None:
            sys.exit(f"API exited: {proc.stderr.read()}")
        try:
            http("GET", "/stats", timeout=2)
            return proc
        except OSError:
            continue
    proc.kill()
    sys.exit("API did not start")


def stop_api(proc):
    os.killpg(proc.pid, signal.SIGTERM)
    try:
        proc.wait(10)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()


def pct(values, p):
    if not values:
        return None
    values = sorted(values)
    return round(values[min(len(values) - 1, int(p / 100 * len(values)))], 1)


async def one_request(scheduled, records):
    """GET /menu over a new connection; latency from the scheduled time, so a slow server can't hide queueing."""
    rec = {"t": scheduled, "status": 0, "cache": "timeout", "version": None}
    try:
        async def go():
            reader, writer = await asyncio.open_connection("127.0.0.1", API_PORT)
            writer.write(b"GET /menu HTTP/1.1\r\nHost: lab\r\nConnection: close\r\n\r\n")
            await writer.drain()
            data = await reader.read()
            writer.close()
            return data
        data = await asyncio.wait_for(go(), CLIENT_TIMEOUT)
        head = data.split(b"\r\n\r\n", 1)[0].decode("latin-1").split("\r\n")
        rec["status"] = int(head[0].split()[1])
        headers = {k.lower(): v.strip() for k, _, v in (h.partition(":") for h in head[1:])}
        rec["cache"] = headers.get("x-cache", "error")
        rec["version"] = int(headers["x-menu-version"]) if "x-menu-version" in headers else None
    except (asyncio.TimeoutError, OSError):
        pass
    rec["ms"] = (time.time() - scheduled) * 1000
    records.append(rec)


async def run_load(records, edits):
    """Open-loop GET /menu at RPS; EDITS menu edits go out EVERY seconds, the first one after WARM seconds."""
    loop = asyncio.get_running_loop()
    start = time.time() + 0.5
    edit_times = [start + WARM + k * EVERY for k in range(EDITS)]
    tasks, total, pending = [], RPS * (WARM + EDITS * EVERY), []

    def do_edit():
        _, body = http("POST", "/admin/edit")
        edits.append(json.loads(body))

    for i in range(total):
        due = start + i / RPS
        if edit_times and due >= edit_times[0]:
            edit_times.pop(0)
            pending.append(loop.run_in_executor(None, do_edit))
        await asyncio.sleep(max(0.0, due - time.time()))
        tasks.append(asyncio.create_task(one_request(due, records)))
    await asyncio.gather(*tasks, *pending)
    return start


def sample_db(env, stop, samples):
    """Every 10 ms: queries running in Postgres right now, and transactions committed so far."""
    with psycopg.connect(**pg_args(env), autocommit=True) as c:
        while not stop.is_set():
            active = c.execute("SELECT count(*) FROM pg_stat_activity WHERE state = 'active' "
                               "AND pid <> pg_backend_pid() AND backend_type = 'client backend'").fetchone()[0]
            xacts = c.execute("SELECT xact_commit FROM pg_stat_database WHERE datname = 'postgres'").fetchone()[0]
            samples.append({"t": time.time(), "active": active, "xact": xacts})
            time.sleep(0.01)


def peak_parallel(intervals):
    events = sorted([(s, 1) for s, _ in intervals] + [(e, -1) for _, e in intervals])
    now = peak = 0
    for _, step in events:
        now += step
        peak = max(peak, now)
    return peak


def one_edit(records, builds, samples, edit, end):
    """What happened between this edit and the next one."""
    t_edit, version = edit["t_edit"], edit["version"]
    after = [r for r in records if t_edit <= r["t"] < end]
    counts = {k: sum(r["cache"] == k for r in after) for k in ("hit", "miss", "wait", "stale", "error", "timeout")}
    waited = [r for r in after if r["cache"] in ("miss", "wait")]
    failed = [r for r in after if r["cache"] in ("error", "timeout")]
    paid = waited + failed
    stale = [r for r in after if r["version"] is not None and r["version"] < version]
    rebuilds = [b for b in builds if t_edit - 0.001 <= b["start"] < end]
    window = [s for s in samples if t_edit <= s["t"] < end]
    first_5s = [r["ms"] for r in after if r["t"] < t_edit + 5]
    series = []
    for sec in range(-2, 12):
        lo, hi = t_edit + sec, t_edit + sec + 1
        rs = [r for r in records if lo <= r["t"] < hi]
        series.append({"s": sec, "requests": len(rs), "p99_ms": pct([r["ms"] for r in rs], 99),
                       "waited": sum(r["cache"] in ("miss", "wait") for r in rs),
                       "stale": sum(r["t"] >= t_edit and r["version"] is not None and r["version"] < version
                                    for r in rs),
                       "failed": sum(r["cache"] in ("error", "timeout") for r in rs),
                       "builds_running": sum(b["start"] < hi and b["end"] > lo for b in rebuilds),
                       "db_active_max": max((s["active"] for s in samples if lo <= s["t"] < hi), default=0)})
    return {
        "edit_ms": round((edit["t_done"] - t_edit) * 1000, 1),
        "rebuilds": len(rebuilds),
        "rebuilds_by_kind": {k: sum(b["kind"] == k for b in rebuilds) for k in ("reader", "background", "publish")},
        "peak_parallel_rebuilds": peak_parallel([(b["start"], b["end"]) for b in rebuilds]),
        "building_at_once": peak_parallel([(b["conn"], b["end"]) for b in rebuilds]),
        "rebuild_ms_p50": pct([(b["end"] - b["start"]) * 1000 for b in rebuilds], 50),
        "rebuild_ms_max": pct([(b["end"] - b["start"]) * 1000 for b in rebuilds], 100),
        "db_active_peak": max((s["active"] for s in window), default=0),
        "db_xact": (window[-1]["xact"] - window[0]["xact"]) if len(window) > 1 else None,
        "requests": len(after),
        "served": counts,
        "waited": len(waited),
        "failed": len(failed),
        "paid": len(paid),
        "cold_window_s": round(max(r["t"] + r["ms"] / 1000 for r in paid) - t_edit, 2) if paid else 0,
        "paid_ms_p50": pct([r["ms"] for r in paid], 50),
        "paid_ms_max": pct([r["ms"] for r in paid], 100),
        "stale": len(stale),
        "stale_window_s": round(max(r["t"] for r in stale) - t_edit, 2) if stale else 0,
        "stale_at_end": any(r["version"] is not None and r["version"] < version for r in after if r["t"] >= end - 2),
        "ms_first_5s": {"p50": pct(first_5s, 50), "p95": pct(first_5s, 95), "p99": pct(first_5s, 99),
                        "max": pct(first_5s, 100)},
        "series": series,
    }


def spread(values):
    values = [v for v in values if v is not None]
    if not values:
        return None
    return {"median": statistics.median(values), "min": min(values), "max": max(values)}


def summarize(strategy, records, builds, edits, samples, start):
    edits = sorted(edits, key=lambda e: e["t_edit"])
    ends = [e["t_edit"] for e in edits[1:]] + [records[-1]["t"] + 1]
    per_edit = [one_edit(records, builds, samples, e, end) for e, end in zip(edits, ends)]
    before = [r["ms"] for r in records if start + 5 <= r["t"] < edits[0]["t_edit"]]
    keys = ("rebuilds", "peak_parallel_rebuilds", "building_at_once", "waited", "failed", "paid", "cold_window_s", "paid_ms_p50",
            "paid_ms_max", "stale", "stale_window_s", "edit_ms", "rebuild_ms_p50", "db_active_peak", "db_xact")
    return {"strategy": strategy, "edits": len(per_edit),
            "ms_before_first_edit": {"p50": pct(before, 50), "p99": pct(before, 99)},
            **{k: spread([e[k] for e in per_edit]) for k in keys},
            "p99_first_5s": spread([e["ms_first_5s"]["p99"] for e in per_edit]),
            "stale_stuck_edits": sum(e["stale_at_end"] for e in per_edit),
            "per_edit": per_edit}


def run_strategy(strategy, env):
    sh("docker", "exec", REDIS_NAME, "redis-cli", "FLUSHALL")
    api = start_api(strategy, env)
    try:
        http("GET", "/menu")  # warm the cache once before the load starts
        http("GET", "/stats")
        records, edits, samples, stop = [], [], [], threading.Event()
        sampler = threading.Thread(target=sample_db, args=(env, stop, samples), daemon=True)
        sampler.start()
        start = asyncio.run(run_load(records, edits))
        stop.set()
        sampler.join()
        _, body = http("GET", "/stats")
        builds = json.loads(body)["builds"]
    finally:
        stop_api(api)
    records.sort(key=lambda r: r["t"])
    return summarize(strategy, records, builds, edits, samples, start)


def measure_build(env):
    """The uncached build alone, on an idle system: 3 warm-up builds, then 20 timed ones."""
    api = start_api("delete", env)
    try:
        times = []
        for i in range(23):
            headers, body = http("GET", "/menu?nocache=1")
            if i >= 3:
                times.append(float(headers["X-Build-Ms"]))
        size_gz = len(body)
        _, body = http("GET", "/menu")
        size_json = len(gzip.decompress(body))
    finally:
        stop_api(api)
    return {"build_ms_p50": round(statistics.median(times), 1), "build_ms_min": round(min(times), 1),
            "build_ms_max": round(max(times), 1), "menu_json_bytes": size_json, "menu_gzip_bytes": size_gz}


def main():
    names = sys.argv[1:] or ["all"]
    strategies = STRATEGIES if names == ["all"] else names
    for s in strategies:
        if s not in STRATEGIES:
            sys.exit(f"unknown strategy {s}; use {', '.join(STRATEGIES)} or all")
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    resource.setrlimit(resource.RLIMIT_NOFILE, (min(hard, 65536) if hard != resource.RLIM_INFINITY else 65536, hard))

    env = dict(os.environ, POSTGRES_PASSWORD=secrets.token_urlsafe(18))  # throwaway, local containers only
    env.update(PG_HOST="127.0.0.1", PG_PORT=str(PG_PORT), PG_PASSWORD=env["POSTGRES_PASSWORD"],
               REDIS_HOST="127.0.0.1", REDIS_PORT=str(REDIS_PORT))
    start_containers(env)
    try:
        with psycopg.connect(**pg_args(env)) as c:
            menu.seed(c)
        result = {"settings": {"rps": RPS, "warm_s": WARM, "edits": EDITS, "every_s": EVERY,
                               "client_timeout_s": CLIENT_TIMEOUT, "workers": int(os.environ.get("WORKERS", 4)),
                               "pool_max": int(os.environ.get("POOL_MAX", 20)), "pg_cpus": PG_CPUS,
                               "redis_cpus": REDIS_CPUS, "build": menu.BUILD, "items": menu.ITEMS, "stores": menu.STORES,
                               "pg_version": sh("docker", "exec", PG_NAME, "postgres", "--version").stdout.strip(),
                               "redis_version": sh("docker", "exec", REDIS_NAME, "redis-server", "--version")
                               .stdout.split()[2]},
                  "build_alone": measure_build(env), "strategies": []}
        print(json.dumps({"settings": result["settings"], "build_alone": result["build_alone"]}, indent=1), flush=True)
        for s in strategies:
            summary = run_strategy(s, env)
            result["strategies"].append(summary)
            print(json.dumps({k: v for k, v in summary.items() if k != "per_edit"}), flush=True)
    finally:
        stop_containers()

    def cell(v):
        if v is None:
            return "-"
        m = f"{v['median']:g}"
        return m if v["min"] == v["max"] else f"{m} ({v['min']:g}-{v['max']:g})"

    cols = ("rebuilds", "peak_parallel_rebuilds", "paid", "failed", "cold_window_s", "paid_ms_p50", "stale",
            "stale_window_s")
    print(f"\nmedian (min-max) over {EDITS} edits, build {menu.BUILD}, {RPS} reads/s")
    heads = ("rebuilds", "at once", "paid", "failed", "cold s", "paid p50 ms", "stale", "stale s")
    print("strategy".ljust(14) + "".join(h.ljust(24) for h in heads))
    for s in result["strategies"]:
        print(s["strategy"].ljust(14) + "".join(cell(s[c]).ljust(24) for c in cols))
    with open(OUT, "w") as f:
        json.dump(result, f, indent=1)


if __name__ == "__main__":
    main()
