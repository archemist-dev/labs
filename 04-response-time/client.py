"""What is inside a response time? Measure the same request from the client, stage by stage, then under load.

Usage: python3 client.py HOST [PORT] [anatomy|load|all]
  anatomy:  N sequential requests per connection mode, spaced out so nothing queues; per stage:
            DNS, TCP connect, TLS handshake, wait (request sent to first byte), transfer, total,
            and the server's own handler time from its Server-Timing header.
              cold    local DNS cache flushed, new connection (needs passwordless sudo for resolvectl)
              new     new connection, DNS answer cached
              reused  one keep-alive connection
  load:     max throughput (closed loop), then open-loop Poisson arrivals at fixed shares of it.
            Latency counts from the moment a request was due, not when it was sent (no coordinated omission).
            Then fan-out: requests that wait for the slowest of n parallel calls, resampled from each step.
Environment: N (anatomy requests per mode, 300), GAP (seconds between them, 0.1),
STEPS (load shares in %, "20,40,60,70,80,90"), SECONDS (per step, 60), CONNS (keep-alive pool, 64),
SEED (1), MODES (anatomy modes, "cold,new,reused"), JSON (path to write the summary for diagrams.py).
HOST should be a DNS name (e.g. the EC2 public DNS name), so DNS is measured. Certificates are not verified
(self-signed lab server). Standard library only (Python 3.12+).
"""
import asyncio
import json
import os
import random
import socket
import ssl
import statistics
import subprocess
import sys
import time

N = int(os.environ.get("N", 300))
GAP = float(os.environ.get("GAP", 0.1))
STEPS = [int(s) for s in os.environ.get("STEPS", "20,40,60,70,80,90").split(",")]
SECONDS = float(os.environ.get("SECONDS", 60))
CONNS = int(os.environ.get("CONNS", 64))
SEED = int(os.environ.get("SEED", 1))
MODES = os.environ.get("MODES", "cold,new,reused").split(",")
FANOUT = (1, 5, 10, 50)
TRIALS = 20_000

CTX = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
CTX.minimum_version = ssl.TLSVersion.TLSv1_3


def request(host):
    return f"GET /order HTTP/1.1\r\nHost: {host}\r\nConnection: keep-alive\r\n\r\n".encode()


def pct(values, p):
    """Nearest-rank percentile."""
    s = sorted(values)
    return s[min(len(s) - 1, max(0, round(p / 100 * len(s)) - 1))]


def parse_head(head):
    length, app = 0, None
    for line in head.split(b"\r\n")[1:]:
        name, _, value = line.partition(b":")
        name = name.strip().lower()
        if name == b"content-length":
            length = int(value)
        elif name == b"server-timing":
            app = float(value.split(b"dur=")[1])
    return length, app


# ---------- anatomy: blocking sockets, one stage at a time ----------

def read_response(sock, first_byte_at):
    """Read one response; return (first byte time, app ms). The first recv marks time to first byte."""
    buf = sock.recv(65536)
    first_byte_at.append(time.perf_counter())
    while b"\r\n\r\n" not in buf:
        buf += sock.recv(65536)
    head, _, body = buf.partition(b"\r\n\r\n")
    length, app = parse_head(head)
    while len(body) < length:
        body += sock.recv(65536)
    return app


def connect(host, port, flush):
    if flush:
        subprocess.run(["sudo", "resolvectl", "flush-caches"], check=True)
    t0 = time.perf_counter()
    addr = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)[0][4]
    t1 = time.perf_counter()
    raw = socket.create_connection(addr)
    raw.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    t2 = time.perf_counter()
    sock = CTX.wrap_socket(raw, server_hostname=host)  # handshake happens here
    t3 = time.perf_counter()
    return sock, {"dns": t1 - t0, "tcp": t2 - t1, "tls": t3 - t2}


def one_request(sock, host):
    first = []
    t0 = time.perf_counter()
    sock.sendall(request(host))
    app = read_response(sock, first)
    t1 = time.perf_counter()
    return {"wait": first[0] - t0, "transfer": t1 - first[0], "app": app / 1000}


def anatomy(host, port):
    out = {}
    for mode in MODES:
        rows, sock = [], None
        if mode == "reused":
            sock, _ = connect(host, port, False)
            one_request(sock, host)  # warm the connection once; not counted
        for _ in range(N):
            time.sleep(GAP)
            if mode == "reused":
                setup = {"dns": 0.0, "tcp": 0.0, "tls": 0.0}
            else:
                sock, setup = connect(host, port, mode == "cold")
            r = setup | one_request(sock, host)
            r["total"] = r["dns"] + r["tcp"] + r["tls"] + r["wait"] + r["transfer"]
            rows.append(r)
            if mode != "reused":
                sock.close()
        if sock:
            sock.close()
        out[mode] = {k: {p: pct([r[k] * 1000 for r in rows], p) for p in (50, 99)} | {"max": max(r[k] for r in rows) * 1000}
                     for k in ("dns", "tcp", "tls", "wait", "transfer", "app", "total")}
    return out


def print_anatomy(a):
    print(f"\n== anatomy: {N} requests per mode, {GAP * 1000:.0f} ms apart (ms; p50 / p99)")
    print(f"{'mode':<8}" + "".join(f"{k:>17}" for k in ("dns", "tcp", "tls", "wait", "transfer", "total", "server app")))
    for mode, s in a.items():
        cells = [f"{s[k][50]:7.2f} /{s[k][99]:7.2f}" for k in ("dns", "tcp", "tls", "wait", "transfer", "total", "app")]
        print(f"{mode:<8}" + "".join(f"{c:>17}" for c in cells))
    r = a.get("reused")
    if r:
        print(f"reused, wait minus server app at p50: {r['wait'][50] - r['app'][50]:.2f} ms (network round trip and queue)")


# ---------- load: asyncio, keep-alive pool ----------

class Pool:
    def __init__(self, host, port):
        self.host, self.port, self.idle, self.opened = host, port, [], 0

    async def open(self):
        conn = await asyncio.open_connection(self.host, self.port, ssl=CTX, server_hostname=self.host)
        conn[1].get_extra_info("socket").setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.opened += 1
        return conn

    async def fill(self, n):
        self.idle += await asyncio.gather(*(self.open() for _ in range(n)))

    async def get(self):
        return self.idle.pop() if self.idle else await self.open()

    def close(self):
        for _, w in self.idle:
            w.close()
        self.idle = []


async def call(pool, req):
    reader, writer = await pool.get()
    writer.write(req)
    head = await reader.readuntil(b"\r\n\r\n")
    length, app = parse_head(head)
    await reader.readexactly(length)
    pool.idle.append((reader, writer))
    return app


async def max_throughput(host, port, conns=32, seconds=10):
    """Closed loop: `conns` clients send back to back. The server's ceiling, not a load to live at."""
    pool = Pool(host, port)
    await pool.fill(conns)
    req, done, end = request(host), 0, time.perf_counter() + seconds

    async def worker():
        nonlocal done
        while time.perf_counter() < end:
            await call(pool, req)
            done += 1

    start = time.perf_counter()
    await asyncio.gather(*(worker() for _ in range(conns)))
    rps = done / (time.perf_counter() - start)
    pool.close()
    return rps


async def open_loop(host, port, rate, seconds, rng):
    """Poisson arrivals at `rate`/s. Each latency starts when the request was due."""
    pool = Pool(host, port)
    await pool.fill(CONNS)
    req, lat, apps, lag = request(host), [], [], []

    async def one(due):
        app = await call(pool, req)
        lat.append((time.perf_counter() - due) * 1000)
        apps.append(app)

    tasks, t = [], time.perf_counter() + 0.5
    end = t + seconds
    while t < end:
        delay = t - time.perf_counter()
        if delay > 0:
            await asyncio.sleep(delay)
        lag.append((time.perf_counter() - t) * 1000)
        tasks.append(asyncio.create_task(one(t)))
        t += rng.expovariate(rate)
    await asyncio.gather(*tasks)
    opened = pool.opened
    pool.close()
    return lat, apps, {"sent": len(tasks), "client_lag_p99_ms": pct(lag, 99), "conns_opened": opened}


def fanout(lat, rng):
    """A page that calls n services in parallel waits for the slowest: resample n latencies, keep the max."""
    p99 = pct(lat, 99)
    out = {}
    for n in FANOUT:
        maxes = [max(rng.choices(lat, k=n)) for _ in range(TRIALS)]
        out[n] = {"p_slow": 1 - 0.99 ** n, "p50": pct(maxes, 50), "p99": pct(maxes, 99),
                  "over_single_p99": sum(m > p99 for m in maxes) / TRIALS}
    return out


async def load(host, port):
    rng = random.Random(SEED)
    peak = await max_throughput(host, port)
    print(f"\n== max throughput (closed loop, 32 connections, 10 s): {peak:.0f} req/s")
    steps = {}
    print(f"\n== open loop, Poisson arrivals, {SECONDS:.0f} s per step, latency from the due time (ms)")
    print(f"{'load':>5} {'req/s':>7} {'sent':>6} {'p50':>8} {'p95':>8} {'p99':>8} {'max':>8} {'app p50':>8} {'lag p99':>8} {'conns':>6}")
    for share in STEPS:
        rate = peak * share / 100
        lat, apps, info = await open_loop(host, port, rate, SECONDS, rng)
        s = {"rate": rate, **{f"p{p}": pct(lat, p) for p in (50, 95, 99)}, "max": max(lat),
             "app_p50": statistics.median(apps), "fanout": fanout(lat, rng), **info}
        steps[share] = s
        print(f"{share:>4}% {rate:>7.0f} {info['sent']:>6} {s['p50']:>8.2f} {s['p95']:>8.2f} {s['p99']:>8.2f} "
              f"{s['max']:>8.1f} {s['app_p50']:>8.2f} {info['client_lag_p99_ms']:>8.2f} {info['conns_opened']:>6}")

    print(f"\n== fan-out: wait for the slowest of n parallel calls ({TRIALS:,} resamples per step)")
    print(f"{'load':>5} {'n':>3} {'P(any call > p99)':>18} {'measured':>9} {'p50 of max':>11} {'p99 of max':>11}")
    for share, s in steps.items():
        for n, f in s["fanout"].items():
            print(f"{share:>4}% {n:>3} {f['p_slow']:>17.1%} {f['over_single_p99']:>9.1%} {f['p50']:>11.2f} {f['p99']:>11.2f}")
    return {"max_rps": peak, "steps": steps}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 8443
    what = sys.argv[-1] if sys.argv[-1] in ("anatomy", "load", "all") else "all"
    summary = {"host": host}
    if what in ("anatomy", "all"):
        summary["anatomy"] = anatomy(host, port)
        print_anatomy(summary["anatomy"])
    if what in ("load", "all"):
        summary["load"] = asyncio.run(load(host, port))
    if os.environ.get("JSON"):
        with open(os.environ["JSON"], "w") as f:
            json.dump(summary, f, indent=1)


if __name__ == "__main__":
    main()
