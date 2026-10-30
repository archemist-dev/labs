# 04 - What's inside a response time?

The same request, the same response, the same bytes, timed from the client stage by stage, then under load. Why do identical requests take different times, and what does a page that calls many services wait for?

- `server.py`: one HTTPS endpoint (TLS 1.3, HTTP/1.1 keep-alive). `GET /order` does fixed work (2,500 rounds of SHA-256 over the body, about 5 ms on a t3.micro) and returns the same 3-item order every time (462 bytes: Cambridge example address, GBP in pence, `DELIVERED`). One asyncio event loop, so one request is worked on at a time and the rest wait in line. Each response carries `Server-Timing: app;dur=<ms>`, the handler's own time: what a server log sees.
- `client.py`: the measurements below. Runs in another region, so the network is real, not simulated.

```bash
# server VM
./run-on-vm.sh server
# client VM
./run-on-vm.sh client ec2-x-x-x-x.eu-central-1.compute.amazonaws.com
# by hand
python3 server.py cert.pem key.pem 8443
python3 client.py HOST 8443 anatomy          # or load, or all
N=50 STEPS=40,80 SECONDS=10 MODES=new,reused python3 client.py localhost all   # quick local try
```

Standard library only (Python 3.12+). The client does not verify the self-signed certificate.

## What is measured

- **Anatomy**: 300 sequential requests per mode, 100 ms apart so nothing queues. Per stage (p50 and p99): DNS, TCP connect, TLS handshake, wait (request sent to first byte: network round trip, queue and work), transfer, total, next to the server's handler time.
  - `cold`: local DNS cache flushed (`resolvectl flush-caches`), new connection. The VPC resolver upstream may still have the answer cached.
  - `new`: new connection, DNS answer cached.
  - `reused`: one keep-alive connection.
- **Load**: the server's max throughput (closed loop, 32 connections, 10 s), then open-loop Poisson arrivals at 20, 40, 60, 70, 80 and 90% of it, 60 s per step, over a pool of 64 keep-alive connections. Each latency starts when the request was due, not when it was sent, so a slow server can't hide the requests it delayed (no coordinated omission). The client's own scheduling lag (p99) is printed per step to show the client isn't the bottleneck.
- **Fan-out**: a page that calls n services in parallel waits for the slowest. For n = 1, 5, 10, 50, 20,000 resamples of n latencies from each load step: the share of pages that hit at least one call slower than the single-call p99 (theory: 1 - 0.99^n), and the p50 and p99 of the slowest call. Assumes the n calls are independent and behave like this server; real services differ.

Not measured: HTTP/2 or HTTP/3, connection pools under failure, retries, hedged requests, more than one server worker.

## Results (2026-10-30)

Server: AWS EC2 t3.micro, eu-central-1a (Frankfurt). Client: AWS EC2 t3.micro, eu-west-2a (London). Both Intel Xeon Platinum 8259CL @ 2.50GHz, 2 vCPU, 1 GB, Ubuntu 26.04.1 LTS, Python 3.14.4, unlimited CPU credits. Raw log: [results-ec2-t3micro-2026-10-30.txt](results-ec2-t3micro-2026-10-30.txt); summaries for the diagrams: `summary-run1.json`, `summary-run2.json`.

Two full runs. Anatomy, max throughput and p50 under load agree between runs (within 5%, 90% load within 20%). p99 under load does not: it swings by up to 6x between runs at the same load, while the server's work stays at 4.8 ms. Both runs are shown; p99 under load is published as a range, never as one number.

### Anatomy: the same request, three ways (ms, p50 / p99)

| Mode | DNS | TCP | TLS | Wait | Transfer | Total | Server app |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cold, run 1 | 0.64 / 5.88 | 12.21 / 14.16 | 13.84 / 15.77 | 17.38 / 19.35 | 0.03 / 0.06 | **44.40** / 52.19 | 4.80 / 4.93 |
| cold, run 2 | 0.63 / 3.59 | 12.20 / 14.21 | 13.84 / 16.40 | 17.52 / 25.34 | 0.03 / 0.07 | **44.42** / 58.68 | 4.91 / 8.47 |
| new, run 1 | 0.42 / 1.85 | 12.22 / 14.84 | 13.80 / 19.34 | 17.36 / 26.52 | 0.03 / 0.05 | **43.86** / 69.35 | 4.83 / 8.33 |
| new, run 2 | 0.42 / 0.50 | 12.22 / 14.17 | 13.82 / 15.75 | 17.50 / 19.49 | 0.03 / 0.06 | **44.01** / 49.77 | 4.92 / 5.02 |
| reused, run 1 | 0 | 0 | 0 | 17.57 / 21.52 | 0.03 / 0.07 | **17.61** / 21.55 | 4.83 / 8.67 |
| reused, run 2 | 0 | 0 | 0 | 17.17 / 19.40 | 0.03 / 0.06 | **17.20** / 19.44 | 4.93 / 6.64 |

- The server log sees 4.8 ms. The client waits 17 ms on a reused connection and 44 ms on a new one: the same request, the same 462 bytes.
- Frankfurt to London is about 12 ms per round trip (TCP connect). TLS 1.3 costs one more round trip plus the handshake (about 14 ms). Wait is a round trip plus the work.
- DNS is under 1 ms at p50 even with the local cache flushed: the VPC resolver answers from its own cache. A browser or phone resolving from scratch pays more; not measured here.

### Load: open loop, Poisson arrivals, 60 s per step (ms)

Max throughput (closed loop, 32 connections): 206 req/s (run 1), 204 req/s (run 2).

| Load | req/s | p50 run 1 / 2 | p95 run 1 / 2 | p99 run 1 / 2 | max run 1 / 2 | Server app p50 |
| --- | --- | --- | --- | --- | --- | --- |
| 20% | 41 | 18.4 / 18.7 | 23.6 / 23.3 | 47 / 27 | 104 / 45 | 4.8 |
| 40% | 82 | 18.7 / 18.8 | 26.1 / 26.2 | 31 / 31 | 48 / 43 | 4.8 |
| 60% | 124 | 20.1 / 20.2 | 32.7 / 38.9 | 81 / 105 | 236 / 139 | 4.8 |
| 70% | 144 | 22.0 / 21.8 | 41.1 / 45.6 | 56 / 270 | 111 / 444 | 4.8 |
| 80% | 165 | 24.9 / 24.0 | 78.0 / 51.4 | 422 / 72 | 1,095 / 105 | 4.8 |
| 90% | 185 | 39.2 / 32.6 | 263 / 131 | 308 / 201 | 1,060 / 293 | 4.8 |

- The work never changes (4.8 ms at every step). What changes is the wait in line.
- p50 barely moves up to 70% load, then climbs: 18 ms at 40%, 25 ms at 80%, 33 to 39 ms at 90%. p95 doubles from 70% to 80% in run 1 and from 80% to 90% in run 2.
- p99 is set by rare stalls of 0.3 to 1 s that back up the queue, and they land in different steps in each run. Over the session the server retransmitted 34 of 125,557 TCP segments (a lost packet waits at least 200 ms before it is sent again) and lost 6.2 s of CPU to other tenants on the host (steal). Neither was tied to a step; the cause of each spike is not proven here.
- The client's own scheduling lag stayed under 2.2 ms at p99, so the client was not the bottleneck. At 80% (run 1) and 90% (run 1) the pool of 64 keep-alive connections ran out and the client opened 23 and 12 new ones, each paying a TLS handshake.

### Fan-out: wait for the slowest of n parallel calls (p50 of the slowest call, ms)

| Load | n = 1 | n = 5 | n = 10 | n = 50 |
| --- | --- | --- | --- | --- |
| 40%, run 1 / 2 | 18.6 / 18.8 | 23.0 / 23.1 | 25.0 / 25.2 | 29.9 / 29.7 |
| 80%, run 1 / 2 | 24.9 / 23.9 | 44.1 / 39.1 | 63.7 / 47.2 | 318 / 69 |
| 90%, run 1 / 2 | 39.1 / 32.7 | 164 / 77 | 224 / 109 | 302 / 191 |

- Share of pages that hit at least one call slower than the single-call p99: 1% (n = 1), 5% (n = 5), 10% (n = 10), 39% to 40% (n = 50) in every step, as 1 - 0.99^n predicts.
- At 40% load, a page of 10 calls has a typical wait of 25 ms against 19 ms for one call. At 90% it is 109 to 224 ms against 33 to 39 ms: the tail of one call becomes the median of the page.
