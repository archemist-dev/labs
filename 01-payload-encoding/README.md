# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 6 status changes) encoded as JSON, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py typical   # order_typical.json, 3 items
.venv/bin/python encoding_test.py big       # order_big.json, 20 items
python3 scale.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-12, AWS EC2 t3.micro)

AWS EC2 t3.micro (2 vCPU, 1 GB, Intel Xeon Platinum 8259CL @ 2.50 GHz), eu-central-1, Ubuntu 26.04, Python 3.14.4; protobuf 7.36.2 (upb), fastavro 1.13.0. Run with `run-on-vm.sh`. Median of 7 x 5,000 runs; two runs matched within about 6%. Re-run it yourself on GitHub Actions (Actions → payload-encoding → Run workflow): a faster CPU, so smaller µs, same sizes and similar ratios. Order: prices in pence (1199 = £11.99), delivery address Anglia Ruskin University, Cambridge, 6 status changes ending in DELIVERED.

Typical order, 3 items (`python encoding_test.py typical`, [order_typical.json](order_typical.json)):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 1,076 | 516 | 100% | 12.7 | 12.2 |
| Protobuf | 470 | 416 | 44% | 0.9 | 1.4 |
| Avro | 417 | 369 | 39% | 26.6 | 19.1 |

Dict to Protobuf build 13.1 µs. Gzip JSON 19.4 µs compress, 7.2 µs decompress. Field names 461 of 1,076 bytes (43%).

Big order, 20 items (`python encoding_test.py big`, [order_big.json](order_big.json)):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,102 | 678 | 100% | 33.8 | 31.8 |
| Protobuf | 1,305 | 603 | 42% | 2.1 | 3.6 |
| Avro | 1,158 | 536 | 37% | 79.0 | 57.5 |

Dict to Protobuf build 43.0 µs. Gzip JSON 37.3 µs compress, 9.4 µs decompress. Field names 1,413 of 3,102 bytes (46%).

Avro speed is fastavro in Python, not the format in general. All timings are Python on one machine: compare ratios, not microseconds.

## Levels: cheapest fix first (`python encoding_test.py typical`)

Starts from [order_untrimmed.json](order_untrimmed.json): the same order the way many APIs send it, with full customer, restaurant, product, payment, courier and metadata objects. Level 1 is [order_typical.json](order_typical.json).

| Level | Change | Bytes | vs L0 | Encode µs |
| --- | --- | --- | --- | --- |
| 0 | Untrimmed JSON | 2,672 | 100% | 25.3 |
| 1 | Trim fields the client doesn't use | 1,076 | 40% | 12.9 |
| 2 | + compact JSON (no spaces) | 989 | 37% | 13.4 |
| 3 | + gzip | 510 | 19% | 32.9 |
| 4 | Protobuf (from the trimmed order) | 470 | 18% | 0.9 |
| 4 | Protobuf + gzip | 416 | 16% | 17.0 |

## At scale (`python3 scale.py`)

JSON to Protobuf savings per request, priced as AWS cross-AZ traffic ($0.01/GB each side, checked 2026-10-06), assuming every call crosses a zone. CPU is JSON vs Protobuf encode plus decode, one hop, on the t3.micro.

| Order | RPS | Saved/req | GB/day | Cross-AZ $/mo | $/yr | CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| typical | 100 | 606 | 5.2 | 3 | 38 | 0.002 |
| typical | 1,000 | 606 | 52.4 | 31 | 377 | 0.023 |
| typical | 10,000 | 606 | 523.6 | 314 | 3,770 | 0.226 |
| big | 100 | 1,797 | 15.5 | 9 | 112 | 0.006 |
| big | 1,000 | 1,797 | 155.3 | 93 | 1,118 | 0.060 |
| big | 10,000 | 1,797 | 1,552.6 | 932 | 11,179 | 0.599 |

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
