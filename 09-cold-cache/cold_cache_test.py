"""Who pays for the refill? Steady menu reads behind a Redis cache, one menu edit mid-run, four ways to handle it.

Usage: python3 cold_cache_test.py [strategy ...|all]
  delete, single_flight, swr, publish (see server.py)
Environment: RPS (menu reads per second, 200), WARM (s before the edit, 20), AFTER (s after it, 40),
CLIENT_TIMEOUT (s, 10), PG_CPUS (1), REDIS_CPUS (0.5), PG_IMAGE (postgres:18), REDIS_IMAGE (redis:8),
OUT (summary file, summary.json), plus BUILD and the menu size (menu.py) and the API settings (server.py).
Each strategy runs on a fresh API process and an empty cache, against the same database. The load is open-loop:
requests go out on schedule whether or not earlier ones came back, and latency counts from the scheduled time.
Counts (rebuilds, requests that waited) depend on the load and the build time; times depend on the machine.
"""
import asyncio
import gzip
import json
import os
import resource
import secrets
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
AFTER = int(os.environ.get("AFTER", 40))
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
                            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
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
    proc.terminate()
    try:
        proc.wait(10)
    except subprocess.TimeoutExpired:
        proc.kill()


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


async def run_load(records, edit_result):
    """Open-loop GET /menu at RPS for WARM + AFTER seconds; the menu edit goes out at WARM."""
    loop = asyncio.get_running_loop()
    start = time.time() + 0.5
    tasks, total = [], RPS * (WARM + AFTER)
    edit_at = start + WARM

    def do_edit():
        _, body = http("POST", "/admin/edit")
        edit_result.update(json.loads(body))

    edit_task = None
    for i in range(total):
        due = start + i / RPS
        if edit_task is None and due >= edit_at:
            edit_task = loop.run_in_executor(None, do_edit)
        await asyncio.sleep(max(0.0, due - time.time()))
        tasks.append(asyncio.create_task(one_request(due, records)))
    await asyncio.gather(*tasks)
    await edit_task
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


def summarize(strategy, records, builds, edit, samples, start):
    t_edit, version = edit["t_edit"], edit["version"]
    before = [r for r in records if start + 5 <= r["t"] < t_edit]
    after = [r for r in records if r["t"] >= t_edit]
    counts = {k: sum(r["cache"] == k for r in after) for k in ("hit", "miss", "wait", "stale", "error", "timeout")}
    waited = [r for r in after if r["cache"] in ("miss", "wait")]
    stale = [r for r in after if r["version"] is not None and r["version"] < version]
    rebuilds = [b for b in builds if b["start"] >= t_edit - 0.001]
    window = [s for s in samples if t_edit <= s["t"] <= t_edit + 10]
    base_x = [s for s in samples if s["t"] < t_edit]
    first_5s = [r["ms"] for r in after if r["t"] < t_edit + 5]
    series = []
    for sec in range(-5, 15):
        lo, hi = t_edit + sec, t_edit + sec + 1
        rs = [r for r in records if lo <= r["t"] < hi]
        series.append({"s": sec, "requests": len(rs), "p99_ms": pct([r["ms"] for r in rs], 99),
                       "waited": sum(r["cache"] in ("miss", "wait") for r in rs),
                       "stale": sum(r["version"] is not None and r["version"] < version for r in rs),
                       "failed": sum(r["cache"] in ("error", "timeout") for r in rs),
                       "builds_running": sum(b["start"] < hi and b["end"] > lo for b in rebuilds),
                       "db_active_max": max((s["active"] for s in samples if lo <= s["t"] < hi), default=0)})
    return {
        "strategy": strategy,
        "edit_ms": round((edit["t_done"] - t_edit) * 1000, 1),
        "rebuilds_after_edit": len(rebuilds),
        "rebuilds_by_kind": {k: sum(b["kind"] == k for b in rebuilds) for k in ("reader", "background", "publish")},
        "peak_parallel_rebuilds": peak_parallel([(b["start"], b["end"]) for b in rebuilds]),
        "rebuild_ms_p50": pct([(b["end"] - b["start"]) * 1000 for b in rebuilds], 50),
        "rebuild_ms_max": pct([(b["end"] - b["start"]) * 1000 for b in rebuilds], 100),
        "db_active_peak": max((s["active"] for s in window), default=0),
        "db_xact_per_s_before": round((base_x[-1]["xact"] - base_x[0]["xact"]) / (base_x[-1]["t"] - base_x[0]["t"]), 1)
        if len(base_x) > 1 else None,
        "db_xact_first_10s": (window[-1]["xact"] - window[0]["xact"]) if len(window) > 1 else None,
        "requests_after_edit": len(after),
        "served_after_edit": counts,
        "waited_for_rebuild": len(waited),
        "cold_window_s": round(max(r["t"] + r["ms"] / 1000 for r in waited) - t_edit, 2) if waited else 0,
        "waited_ms_p50": pct([r["ms"] for r in waited], 50),
        "waited_ms_max": pct([r["ms"] for r in waited], 100),
        "stale_responses": len(stale),
        "stale_window_s": round(max(r["t"] for r in stale) - t_edit, 2) if stale else 0,
        "stale_at_end": any(r["version"] is not None and r["version"] < version
                            for r in records if r["t"] > records[-1]["t"] - 1),
        "ms_before_edit": {"p50": pct([r["ms"] for r in before], 50), "p99": pct([r["ms"] for r in before], 99)},
        "ms_first_5s_after": {"p50": pct(first_5s, 50), "p95": pct(first_5s, 95), "p99": pct(first_5s, 99),
                              "max": pct(first_5s, 100)},
        "series": series,
    }


def run_strategy(strategy, env):
    sh("docker", "exec", REDIS_NAME, "redis-cli", "FLUSHALL")
    api = start_api(strategy, env)
    try:
        http("GET", "/menu")  # warm the cache once before the load starts
        http("GET", "/stats")
        records, edit, samples, stop = [], {}, [], threading.Event()
        sampler = threading.Thread(target=sample_db, args=(env, stop, samples), daemon=True)
        sampler.start()
        start = asyncio.run(run_load(records, edit))
        stop.set()
        sampler.join()
        _, body = http("GET", "/stats")
        builds = json.loads(body)["builds"]
    finally:
        stop_api(api)
    records.sort(key=lambda r: r["t"])
    return summarize(strategy, records, builds, edit, samples, start)


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
        result = {"settings": {"rps": RPS, "warm_s": WARM, "after_s": AFTER, "client_timeout_s": CLIENT_TIMEOUT,
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
            print(json.dumps({k: v for k, v in summary.items() if k != "series"}, indent=1), flush=True)
    finally:
        stop_containers()

    print(f"\n{'strategy':<14}{'rebuilds':>9}{'peak':>6}{'waited':>8}{'cold s':>8}{'wait p50':>10}{'wait max':>10}"
          f"{'stale':>7}{'stale s':>9}{'failed':>8}{'p99 5s':>9}")
    for s in result["strategies"]:
        failed = s["served_after_edit"]["error"] + s["served_after_edit"]["timeout"]
        print(f"{s['strategy']:<14}{s['rebuilds_after_edit']:>9}{s['peak_parallel_rebuilds']:>6}"
              f"{s['waited_for_rebuild']:>8}{s['cold_window_s']:>8}{str(s['waited_ms_p50']):>10}"
              f"{str(s['waited_ms_max']):>10}{s['stale_responses']:>7}{s['stale_window_s']:>9}{failed:>8}"
              f"{str(s['ms_first_5s_after']['p99']):>9}")
    with open(OUT, "w") as f:
        json.dump(result, f, indent=1)


if __name__ == "__main__":
    main()
