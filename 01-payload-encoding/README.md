# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 5 status changes) encoded as JSON, pickle, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py 3   # typical order
.venv/bin/python encoding_test.py     # big order, 20 items
python3 scale.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-09)

Python 3.12.10, Apple M4 Pro, macOS 26.6; protobuf 7.36.2 (upb), fastavro 1.13.0. Median of 7 x 5,000 runs; two runs matched within 5%.

Typical order, 3 items (`python encoding_test.py 3`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 994 | 484 | 100% | 4.7 | 3.8 |
| pickle | 754 | 585 | 76% | 1.5 | 1.9 |
| Protobuf | 438 | 392 | 44% | 0.4 | 0.5 |
| Avro | 391 | 350 | 39% | 9.8 | 7.6 |

Dict to Protobuf build 4.2 µs. Gzip JSON 9.2 µs compress, 2.8 µs decompress. Field names 424 of 994 bytes (43%).

Big order, 20 items (`python encoding_test.py`):

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,046 | 648 | 100% | 12.5 | 10.3 |
| pickle | 1,641 | 785 | 54% | 4.2 | 4.7 |
| Protobuf | 1,290 | 588 | 42% | 0.9 | 1.3 |
| Avro | 1,149 | 527 | 38% | 29.3 | 23.3 |

Dict to Protobuf build 14.0 µs. Gzip JSON 17.0 µs compress, 3.6 µs decompress. Field names 1,376 of 3,046 bytes (45%).

Avro speed is fastavro in Python, not the format in general. All timings are Python on one machine: compare ratios, not microseconds.

## At scale (`python3 scale.py`)

JSON to Protobuf savings per request, priced as AWS cross-AZ traffic ($0.01/GB each side, checked 2026-10-06), assuming every call crosses a zone. CPU is JSON vs Protobuf encode plus decode, one hop.

| Order | RPS | Saved/req | GB/day | Cross-AZ $/mo | $/yr | CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| typical | 100 | 556 | 4.8 | 3 | 35 | 0.001 |
| typical | 1,000 | 556 | 48.0 | 29 | 346 | 0.008 |
| typical | 10,000 | 556 | 480.4 | 288 | 3,459 | 0.076 |
| big | 100 | 1,756 | 15.2 | 9 | 109 | 0.002 |
| big | 1,000 | 1,756 | 151.7 | 91 | 1,092 | 0.021 |
| big | 10,000 | 1,756 | 1,517.2 | 910 | 10,924 | 0.206 |

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| pickle | - | `tip` from class default; removed `notes` silently kept | Renamed or moved class: AttributeError. Python only |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
