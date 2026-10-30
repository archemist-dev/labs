"""One HTTPS endpoint with fixed work and a fixed response: the same 3-item order, the same bytes, every time.

Usage: python3 server.py CERT KEY [PORT]
  GET /order  the order as JSON after a fixed amount of work (WORK rounds of SHA-256 over the body)
Environment: WORK (default 2500 rounds, about 5 ms on a t3.micro).
One asyncio event loop, so one request is worked on at a time and the rest wait in line: a single queue.
Each response carries `Server-Timing: app;dur=<ms>`, the handler's own time, which is what a server log would see.
TLS 1.3 only, HTTP/1.1 keep-alive. Standard library only (Python 3.12+).
"""
import asyncio
import hashlib
import json
import os
import ssl
import sys
import time

WORK = int(os.environ.get("WORK", 2500))

ORDER = {
    "id": "ord_000184",
    "status": "DELIVERED",
    "currency": "GBP",
    "items": [
        {"sku": "margherita-12", "name": "Margherita 12in", "qty": 1, "price": 1199},
        {"sku": "garlic-bread", "name": "Garlic bread", "qty": 2, "price": 449},
        {"sku": "lemonade-330", "name": "Lemonade 330ml", "qty": 1, "price": 249},
    ],
    "total": 2346,
    "address": {"street": "East Rd", "postcode": "CB1 1PT", "house": "Anglia Ruskin University",
                "city": "Cambridge", "lat": 52.203889, "lon": 0.132917},
    "customer": "guest_1",
    "courier": "courier_7",
}
BODY = json.dumps(ORDER, separators=(",", ":")).encode()


def work():
    """Fixed CPU work: the same rounds over the same bytes, so every request costs the same."""
    h = b""
    for _ in range(WORK):
        h = hashlib.sha256(h + BODY).digest()
    return h


async def handle(reader, writer):
    try:
        while True:
            head = await reader.readuntil(b"\r\n\r\n")
            if not head.startswith(b"GET /order "):
                writer.write(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")
                await writer.drain()
                continue
            start = time.perf_counter()
            work()
            app_ms = (time.perf_counter() - start) * 1000
            writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
                         b"Content-Length: %d\r\nServer-Timing: app;dur=%.3f\r\n\r\n" % (len(BODY), app_ms) + BODY)
            await writer.drain()
    except (asyncio.IncompleteReadError, ConnectionError, ssl.SSLError):
        pass
    finally:
        writer.close()


async def main(cert, key, port):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_3
    ctx.load_cert_chain(cert, key)
    server = await asyncio.start_server(handle, "0.0.0.0", port, ssl=ctx, backlog=1024)
    start = time.perf_counter()
    work()
    print(f"listening on :{port}, body {len(BODY)} bytes, WORK {WORK} rounds ({(time.perf_counter() - start) * 1000:.2f} ms)",
          flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 8443))
