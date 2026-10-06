# 01 - Your payload is too big

Same synthetic order (20 items with modifiers, nested address, 5 status changes) encoded as JSON, pickle, Protobuf and Avro. Measures size, encode and decode time, then changes the schema (remove `notes`, add `tip`) and checks old and new readers.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python encoding_test.py
```

Protobuf schemas are built in code, so no `protoc` is needed. Data is synthetic.

## Results (2026-10-06)

Python 3.12.10, Apple M4 Pro, macOS 26.6; protobuf 7.36.2 (upb), fastavro 1.13.0. Median of 7 x 5,000 runs; two runs matched within 5%.

| Format | Bytes | Gzip | vs JSON | Encode µs | Decode µs |
| --- | --- | --- | --- | --- | --- |
| JSON | 3,046 | 649 | 100% | 12.9 | 9.9 |
| pickle | 1,640 | 781 | 54% | 3.9 | 4.5 |
| Protobuf | 1,289 | 584 | 42% | 0.8 | 1.2 |
| Avro | 1,148 | 524 | 38% | 28.3 | 22.3 |

Protobuf encode excludes building the message from a dict (12.9 µs). Avro speed is fastavro in Python, not the format in general.

Schema change, v1 to v2:

| Format | Old reader, new data | New reader, old data | Trap |
| --- | --- | --- | --- |
| JSON | KeyError | KeyError; works with `.get()` | Nothing enforces safe readers |
| pickle | - | `tip` from class default; removed `notes` silently kept | Renamed or moved class: AttributeError. Python only |
| Protobuf | Works | Works | Reused field number: wrong value, no error |
| Avro | Fails: `notes` has no default | Works with a default; fails without | Wrong writer schema: garbage, no error |
