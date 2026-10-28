"""Byte-level data for the Shorts: which JSON bytes are field names, the real Protobuf bytes (Short 1),
and why a reader with the wrong Avro schema reads tip = 46 (Short 2).

Usage: python video_data.py OUT.json
Same typical order and Protobuf schema as encoding_test.py; asserts the sizes match the published results.
"""
import contextlib
import io
import json
import sys
from pathlib import Path

# Import the test itself so the schema can't drift; it runs its benchmarks on import (a few seconds), output hidden.
out_path, sys.argv = sys.argv[1], [sys.argv[0], "typical"]
with contextlib.redirect_stdout(io.StringIO()):
    from encoding_test import AV1, AV2, ProtoV1, avro_dec, avro_enc, to_proto

ORDER = json.loads(Path(__file__).with_name("order_typical.json").read_text())

# JSON: the bytes encoding_test.py measures (json.dumps defaults), each marked as name or value.
text = json.dumps(ORDER)
names = [0] * len(text)


def mark(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield f'{json.dumps(k)}: '
            yield from mark(v)
    elif isinstance(o, list):
        for v in o:
            yield from mark(v)


pos = 0
for key in mark(ORDER):  # keys appear in document order, so each search starts after the last one
    i = text.index(key, pos)
    names[i:i + len(key)] = [1] * len(key)
    pos = i + len(key)

# Protobuf: walk the wire format and mark each byte as tag (field number + type), length or value.
data = to_proto(ProtoV1, ORDER).SerializeToString()
kinds = [""] * len(data)
NESTED = {9, 10, 11}  # address, items, status_history


def varint(buf, i):
    """Returns (value, index after the varint)."""
    n, shift = 0, 0
    while True:
        b = buf[i]
        n |= (b & 0x7F) << shift
        i += 1
        if not b & 0x80:
            return n, i
        shift += 7


def walk(lo, hi, top):
    i = lo
    while i < hi:
        tag, j = varint(data, i)
        kinds[i:j] = ["tag"] * (j - i)
        field, wire = tag >> 3, tag & 7
        if wire == 0:
            _, k = varint(data, j)
            kinds[j:k] = ["value"] * (k - j)
        elif wire == 1:
            k = j + 8
            kinds[j:k] = ["value"] * 8
        elif wire == 2:
            n, s = varint(data, j)
            kinds[j:s] = ["len"] * (s - j)
            k = s + n
            if top and field in NESTED:
                walk(s, k, False)
            else:
                kinds[s:k] = ["value"] * n
        else:
            raise ValueError(f"wire type {wire}")
        i = k


walk(0, len(data), True)

# Avro: v1 ends with notes (a length prefix, then the text). A reader that assumes the v2 schema expects tip there,
# so it reads the length prefix as the tip.
avro = avro_enc(AV1, ORDER)
notes = ORDER["notes"]
prefix = avro[-len(notes) - 1]
tip_wrong = avro_dec(AV2, None, avro)["tip"]
tip_right = avro_dec(AV1, AV2, avro)["tip"]

assert len(text) == 1076 and sum(names) == 461, (len(text), sum(names))
assert len(avro) == 417 and (prefix >> 1) ^ -(prefix & 1) == len(notes) == tip_wrong == 46 and tip_right == 0
assert len(data) == 470 and all(kinds), len(data)
out = {
    "json": text,
    "json_names": "".join(map(str, names)),
    "json_pretty": json.dumps(ORDER, indent=2),
    "proto_hex": data.hex(),
    "proto_kinds": "".join({"tag": "t", "len": "l", "value": "v"}[k] for k in kinds),
    "avro_tail_hex": avro[-len(notes) - 9:].hex(),  # the last status time, the notes length prefix, the notes text
    "avro_notes": notes,
    "avro_prefix_hex": f"{prefix:02x}",
    "avro_tip_wrong": tip_wrong,
    "avro_tip_right": tip_right,
}
Path(out_path).write_text(json.dumps(out, indent=1))
print(f"JSON {len(text)} bytes, {sum(names)} names; Protobuf {len(data)} bytes: "
      f"{kinds.count('tag')} tag, {kinds.count('len')} length, {kinds.count('value')} value; "
      f"Avro {len(avro)} bytes, wrong schema reads tip = {tip_wrong} (notes length prefix 0x{prefix:02x}), right schemas {tip_right}")
