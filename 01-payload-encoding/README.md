# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 6 status changes) encoded as JSON, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py typical   # order_typical.json, 3 items
.venv/bin/python encoding_test.py big       # order_big.json, 20 items
python3 scale.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-09, address split into street, postcode, house)

Python 3.12.10, Apple M4 Pro, macOS 26.6; protobuf 7.36.2 (upb), fastavro 1.13.0. Median of 7 x 5,000 runs; two runs matched within 5%. Order: prices in pence (1199 = £11.99), delivery address Anglia Ruskin University, Cambridge, 6 status changes ending in DELIVERED.

Typical order, 3 items (`python encoding_test.py typical`, [order_typical.json](order_typical.json)):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 1,076 | 516 | 100% | 4.7 | 4.1 |
| Protobuf | 470 | 416 | 44% | 0.4 | 0.6 |
| Avro | 417 | 369 | 39% | 10.8 | 8.2 |

Dict to Protobuf build 4.6 µs. Gzip JSON 9.3 µs compress, 2.9 µs decompress. Field names 461 of 1,076 bytes (43%).

Big order, 20 items (`python encoding_test.py big`, [order_big.json](order_big.json)):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,102 | 678 | 100% | 12.4 | 10.4 |
| Protobuf | 1,305 | 603 | 42% | 0.9 | 1.3 |
| Avro | 1,158 | 536 | 37% | 31.1 | 23.5 |

Dict to Protobuf build 13.9 µs. Gzip JSON 16.6 µs compress, 3.2 µs decompress. Field names 1,413 of 3,102 bytes (46%).

Avro speed is fastavro in Python, not the format in general. All timings are Python on one machine: compare ratios, not microseconds.

## At scale (`python3 scale.py`)

JSON to Protobuf savings per request, priced as AWS cross-AZ traffic ($0.01/GB each side, checked 2026-10-06), assuming every call crosses a zone. CPU is JSON vs Protobuf encode plus decode, one hop.

| Order | RPS | Saved/req | GB/day | Cross-AZ $/mo | $/yr | CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| typical | 100 | 606 | 5.2 | 3 | 38 | 0.001 |
| typical | 1,000 | 606 | 52.4 | 31 | 377 | 0.008 |
| typical | 10,000 | 606 | 523.6 | 314 | 3,770 | 0.078 |
| big | 100 | 1,797 | 15.5 | 9 | 112 | 0.002 |
| big | 1,000 | 1,797 | 155.3 | 93 | 1,118 | 0.021 |
| big | 10,000 | 1,797 | 1,552.6 | 932 | 11,179 | 0.206 |

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
