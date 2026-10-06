# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 5 status changes) encoded as JSON, pickle, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py 3   # typical order
.venv/bin/python encoding_test.py     # big order, 20 items
python3 scale.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-06)

Python 3.12.10, Apple M4 Pro, macOS 26.6; protobuf 7.36.2 (upb), fastavro 1.13.0. Median of 7 x 5,000 runs; two runs matched within 5%.

Typical order, 3 items (`python encoding_test.py 3`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 994 | 485 | 100% | 4.6 | 3.8 |
| pickle | 753 | 581 | 76% | 1.5 | 1.8 |
| Protobuf | 437 | 389 | 44% | 0.4 | 0.5 |
| Avro | 390 | 347 | 39% | 9.4 | 7.2 |

Dict to Protobuf build 4.2 µs. Gzip JSON 9.2 µs compress, 2.8 µs decompress. Field names 424 of 994 bytes (43%).

Big order, 20 items (`python encoding_test.py`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,046 | 649 | 100% | 12.9 | 9.9 |
| pickle | 1,640 | 781 | 54% | 3.9 | 4.5 |
| Protobuf | 1,289 | 584 | 42% | 0.8 | 1.2 |
| Avro | 1,148 | 524 | 38% | 28.3 | 22.3 |

Dict to Protobuf build 12.9 µs. Gzip JSON 16.8 µs compress, 3.2 µs decompress. Field names 1,376 of 3,046 bytes (45%).

Avro speed is fastavro in Python, not the format in general. All timings are Python on one machine: compare ratios, not microseconds.

## At scale (`python3 scale.py`)

JSON to Protobuf savings per request, priced as AWS cross-AZ traffic ($0.01/GB each side, checked 2026-10-06), assuming every call crosses a zone. CPU is JSON vs Protobuf encode plus decode, one hop.

| Order | RPS | Saved/req | GB/day | Cross-AZ $/mo | $/yr | CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| typical | 100 | 557 | 4.8 | 3 | 35 | 0.001 |
| typical | 1,000 | 557 | 48.1 | 29 | 346 | 0.007 |
| typical | 10,000 | 557 | 481.2 | 289 | 3,465 | 0.075 |
| big | 100 | 1,757 | 15.2 | 9 | 109 | 0.002 |
| big | 1,000 | 1,757 | 151.8 | 91 | 1,093 | 0.021 |
| big | 10,000 | 1,757 | 1,518.0 | 911 | 10,930 | 0.208 |

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| pickle | - | `tip` from class default; removed `notes` silently kept | Renamed or moved class: AttributeError. Python only |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
