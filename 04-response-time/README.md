# 04 - What's inside a response time?

The same request, the same response, the same bytes, timed from the client stage by stage, then under load. Why do identical requests take different times, and what does a page that calls many services wait for?

- `server.py`: one HTTPS endpoint (TLS 1.3, HTTP/1.1 keep-alive). `GET /order` does fixed work (6,000 rounds of SHA-256 over the body) and returns the same 3-item order every time (462 bytes: Cambridge example address, GBP in pence, `DELIVERED`). One asyncio event loop, so one request is worked on at a time and the rest wait in line. Each response carries `Server-Timing: app;dur=<ms>`, the handler's own time: what a server log sees.
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

## Results

Not run yet.
