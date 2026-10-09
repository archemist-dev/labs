# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 6 status changes) encoded as JSON, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py 3   # typical order
.venv/bin/python encoding_test.py     # big order, 20 items
python3 scale.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-09)

Python 3.12.10, Apple M4 Pro, macOS 26.6; protobuf 7.36.2 (upb), fastavro 1.13.0. Median of 7 x 5,000 runs; two runs matched within 5%. Order: prices in pence (1199 = £11.99), delivery address Anglia Ruskin University, Cambridge, 6 status changes ending in DELIVERED.

Typical order, 3 items (`python encoding_test.py 3`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 1,051 | 504 | 100% | 4.8 | 4.0 |
| Protobuf | 470 | 416 | 45% | 0.4 | 0.5 |
| Avro | 419 | 371 | 40% | 10.1 | 7.9 |

Dict to Protobuf build 4.4 µs. Gzip JSON 9.2 µs compress, 2.9 µs decompress. Field names 440 of 1,051 bytes (42%).

Big order, 20 items (`python encoding_test.py`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,077 | 666 | 100% | 12.8 | 10.2 |
| Protobuf | 1,305 | 602 | 42% | 1.0 | 1.3 |
| Avro | 1,160 | 537 | 38% | 30.2 | 23.8 |

Dict to Protobuf build 13.5 µs. Gzip JSON 16.4 µs compress, 3.3 µs decompress. Field names 1,392 of 3,077 bytes (45%).

Avro speed is fastavro in Python, not the format in general. All timings are Python on one machine: compare ratios, not microseconds.

## At scale (`python3 scale.py`)

JSON to Protobuf savings per request, priced as AWS cross-AZ traffic ($0.01/GB each side, checked 2026-10-06), assuming every call crosses a zone. CPU is JSON vs Protobuf encode plus decode, one hop.

| Order | RPS | Saved/req | GB/day | Cross-AZ $/mo | $/yr | CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| typical | 100 | 581 | 5.0 | 3 | 36 | 0.001 |
| typical | 1,000 | 581 | 50.2 | 30 | 361 | 0.008 |
| typical | 10,000 | 581 | 502.0 | 301 | 3,614 | 0.079 |
| big | 100 | 1,772 | 15.3 | 9 | 110 | 0.002 |
| big | 1,000 | 1,772 | 153.1 | 92 | 1,102 | 0.021 |
| big | 10,000 | 1,772 | 1,531.0 | 919 | 11,023 | 0.207 |

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
