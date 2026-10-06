"""Encoding test for 'Your Payload Is Too Big'. Synthetic order payload only."""
import dataclasses
import gzip
import io
import json
import pickle
import platform
import statistics
import sys
import time

import fastavro
import google.protobuf
from google.protobuf import descriptor_pb2, message_factory
from google.protobuf.internal import api_implementation

# ---------- synthetic payload ----------
def make_order():
    return {
        "order_id": 48213377,
        "order_uuid": "3f6c1a2e-8b4d-4c1e-9a77-0d2f5b8e91c4",
        "customer_id": 90031,
        "created_at": 1759737600123,
        "status": "DELIVERING",
        "currency": "UZS",
        "total": 0,
        "notes": "Please call on arrival, the intercom is broken",
        "address": {
            "street": "Example street 12, apt 34",
            "city": "Tashkent",
            "lat": 41.311081,
            "lon": 69.240562,
            "comment": "Third entrance, fourth floor",
        },
        "items": [
            {
                "product_id": 1000 + i,
                "name": f"Pizza Margherita {i}",
                "qty": 1 + i % 3,
                "unit_price": 89000 + i * 1000,
                "modifiers": ["extra cheese", "thin crust"] if i % 2 else ["no onion"],
            }
            for i in range(20)
        ],
        "status_history": [
            {"status": s, "at": 1759737600123 + n * 60000}
            for n, s in enumerate(["CREATED", "PAID", "COOKING", "READY", "DELIVERING"])
        ],
    }

ORDER = make_order()
ORDER["total"] = sum(i["qty"] * i["unit_price"] for i in ORDER["items"])

# ---------- protobuf schema, built in code (no protoc) ----------
F = descriptor_pb2.FieldDescriptorProto

def build_proto(variant):
    fdp = descriptor_pb2.FileDescriptorProto(name=f"order_{variant}.proto", package=f"t_{variant}", syntax="proto3")

    def msg(name, fields):
        m = fdp.message_type.add(name=name)
        for fname, num, ftype, label, tname in fields:
            f = m.field.add(name=fname, number=num, type=ftype, label=label)
            if tname:
                f.type_name = f".t_{variant}.{tname}"

    O, R = F.LABEL_OPTIONAL, F.LABEL_REPEATED
    msg("Address", [("street", 1, F.TYPE_STRING, O, None), ("city", 2, F.TYPE_STRING, O, None),
                    ("lat", 3, F.TYPE_DOUBLE, O, None), ("lon", 4, F.TYPE_DOUBLE, O, None),
                    ("comment", 5, F.TYPE_STRING, O, None)])
    msg("Item", [("product_id", 1, F.TYPE_INT64, O, None), ("name", 2, F.TYPE_STRING, O, None),
                 ("qty", 3, F.TYPE_INT32, O, None), ("unit_price", 4, F.TYPE_INT64, O, None),
                 ("modifiers", 5, F.TYPE_STRING, R, None)])
    msg("StatusChange", [("status", 1, F.TYPE_STRING, O, None), ("at", 2, F.TYPE_INT64, O, None)])
    fields = [("order_id", 1, F.TYPE_INT64, O, None), ("order_uuid", 2, F.TYPE_STRING, O, None),
              ("customer_id", 3, F.TYPE_INT64, O, None), ("created_at", 4, F.TYPE_INT64, O, None),
              ("status", 5, F.TYPE_STRING, O, None), ("currency", 6, F.TYPE_STRING, O, None),
              ("total", 7, F.TYPE_INT64, O, None),
              ("address", 9, F.TYPE_MESSAGE, O, "Address"), ("items", 10, F.TYPE_MESSAGE, R, "Item"),
              ("status_history", 11, F.TYPE_MESSAGE, R, "StatusChange")]
    if variant == "v1":
        fields.append(("notes", 8, F.TYPE_STRING, O, None))
    elif variant == "v2":          # notes removed (8 retired), tip added as a new number
        fields.append(("tip", 12, F.TYPE_INT64, O, None))
    elif variant == "v2bad":       # notes removed, tip REUSES number 8 with another type
        fields.append(("tip", 8, F.TYPE_INT64, O, None))
    msg("Order", fields)
    return message_factory.GetMessages([fdp])[f"t_{variant}.Order"]

ProtoV1, ProtoV2, ProtoV2bad = build_proto("v1"), build_proto("v2"), build_proto("v2bad")

def to_proto(cls, d):
    m = cls()
    for k, v in d.items():
        if k == "address":
            m.address.CopyFrom(m.address.__class__(**v))
        elif k == "items":
            for it in v:
                m.items.add(**it)
        elif k == "status_history":
            for s in v:
                m.status_history.add(**s)
        else:
            setattr(m, k, v)
    return m

# ---------- avro schema ----------
def avro_schema(variant, tip_default=True):
    fields = [
        {"name": "order_id", "type": "long"}, {"name": "order_uuid", "type": "string"},
        {"name": "customer_id", "type": "long"}, {"name": "created_at", "type": "long"},
        {"name": "status", "type": "string"}, {"name": "currency", "type": "string"},
        {"name": "total", "type": "long"},
        {"name": "address", "type": {"type": "record", "name": "Address", "fields": [
            {"name": "street", "type": "string"}, {"name": "city", "type": "string"},
            {"name": "lat", "type": "double"}, {"name": "lon", "type": "double"},
            {"name": "comment", "type": "string"}]}},
        {"name": "items", "type": {"type": "array", "items": {"type": "record", "name": "Item", "fields": [
            {"name": "product_id", "type": "long"}, {"name": "name", "type": "string"},
            {"name": "qty", "type": "int"}, {"name": "unit_price", "type": "long"},
            {"name": "modifiers", "type": {"type": "array", "items": "string"}}]}}},
        {"name": "status_history", "type": {"type": "array", "items": {"type": "record", "name": "StatusChange",
            "fields": [{"name": "status", "type": "string"}, {"name": "at", "type": "long"}]}}},
    ]
    if variant == "v1":
        fields.append({"name": "notes", "type": "string"})
    else:
        tip = {"name": "tip", "type": "long"}
        if tip_default:
            tip["default"] = 0
        fields.append(tip)
    return fastavro.parse_schema({"type": "record", "name": "Order", "fields": fields})

AV1, AV2, AV2_NODEFAULT = avro_schema("v1"), avro_schema("v2"), avro_schema("v2", tip_default=False)

def avro_enc(schema, rec):
    b = io.BytesIO()
    fastavro.schemaless_writer(b, schema, rec)
    return b.getvalue()

def avro_dec(writer, reader, data):
    return fastavro.schemaless_reader(io.BytesIO(data), writer, reader)

# ---------- 1+2+3: size and speed ----------
def bench(fn, n=5000, repeat=7):
    runs = []
    for _ in range(repeat):
        t = time.perf_counter_ns()
        for _ in range(n):
            fn()
        runs.append((time.perf_counter_ns() - t) / n / 1000)
    return statistics.median(runs)

proto_msg = to_proto(ProtoV1, ORDER)
codecs = {
    "JSON": (lambda: json.dumps(ORDER).encode(), lambda b: json.loads(b)),
    "pickle": (lambda: pickle.dumps(ORDER, protocol=pickle.HIGHEST_PROTOCOL), lambda b: pickle.loads(b)),
    "Protobuf": (lambda: proto_msg.SerializeToString(), lambda b: ProtoV1.FromString(b)),
    "Avro": (lambda: avro_enc(AV1, ORDER), lambda b: avro_dec(AV1, None, b)),
}

print(f"Python {platform.python_version()} on {platform.machine()} ({platform.platform()})")
print(f"protobuf {google.protobuf.__version__} backend={api_implementation.Type()}, fastavro {fastavro.__version__}")
print(f"Payload: 1 order, {len(ORDER['items'])} items, {len(ORDER['status_history'])} status changes\n")
print(f"{'format':<10}{'bytes':>8}{'gzip':>8}{'vs JSON':>9}{'encode µs':>11}{'decode µs':>11}")
json_size = len(codecs["JSON"][0]())
for name, (enc, dec) in codecs.items():
    data = enc()
    assert dec(data) is not None
    print(f"{name:<10}{len(data):>8}{len(gzip.compress(data)):>8}{len(data)/json_size:>8.0%}"
          f"{bench(enc):>11.1f}{bench(lambda: dec(data)):>11.1f}")
print(f"{'(dict->proto build)':<26}{bench(lambda: to_proto(ProtoV1, ORDER)):>19.1f}")
json_bytes = codecs["JSON"][0]()
json_gz = gzip.compress(json_bytes)
print(f"{'(gzip JSON)':<26}{bench(lambda: gzip.compress(json_bytes)):>19.1f}{bench(lambda: gzip.decompress(json_gz)):>11.1f}")
print("Note: field names inside the bytes ->", {n: b'order_uuid' in c[0]() for n, c in codecs.items()})

# ---------- 4: schema change (v1 -> v2: remove notes, add tip) ----------
def attempt(label, fn):
    try:
        print(f"  OK    {label}: {fn()}")
    except Exception as e:
        print(f"  FAIL  {label}: {type(e).__name__}: {e}")

print("\nSchema change: v2 removes `notes`, adds `tip`")
v2_order = {k: v for k, v in ORDER.items() if k != "notes"} | {"tip": 5000}

print("JSON")
old_reader = lambda d: (d["order_id"], d["notes"])         # code written for v1
new_reader = lambda d: (d["order_id"], d["tip"])           # code written for v2
attempt("old reader, new data (strict d['notes'])", lambda: old_reader(json.loads(json.dumps(v2_order))))
attempt("new reader, old data (strict d['tip'])", lambda: new_reader(json.loads(json.dumps(ORDER))))
attempt("new reader, old data (d.get('tip', 0))", lambda: json.loads(json.dumps(ORDER)).get("tip", 0))

print("pickle (dataclass, as pickle is normally used)")
@dataclasses.dataclass
class Order:
    order_id: int
    notes: str
old_blob = pickle.dumps(Order(48213377, "call on arrival"))
@dataclasses.dataclass
class Order:  # noqa: F811  v2 of the same class
    order_id: int
    tip: int = 0
o = pickle.loads(old_blob)
attempt("new class, old data: tip", lambda: o.tip)
attempt("new class, old data: removed field still there?", lambda: f"notes={o.__dict__.get('notes')!r} (silently kept)")
del Order
attempt("class renamed or moved, old data", lambda: pickle.loads(old_blob))

print("Protobuf")
v1_bytes = to_proto(ProtoV1, ORDER).SerializeToString()
v2_bytes = to_proto(ProtoV2, v2_order).SerializeToString()
attempt("old reader, new data", lambda: f"order_id={ProtoV1.FromString(v2_bytes).order_id}, notes={ProtoV1.FromString(v2_bytes).notes!r} (default), tip skipped")
attempt("new reader, old data", lambda: f"order_id={ProtoV2.FromString(v1_bytes).order_id}, tip={ProtoV2.FromString(v1_bytes).tip} (default)")
attempt("BAD: tip reuses notes' field number 8", lambda: f"tip={ProtoV2bad.FromString(v1_bytes).tip}, no error raised")

print("Avro")
v2_avro = avro_enc(AV2, v2_order)
v1_avro = avro_enc(AV1, ORDER)
attempt("new reader, old data (writer schema known)", lambda: avro_dec(AV1, AV2, v1_avro)["tip"])
attempt("old reader, new data (writer schema known)", lambda: avro_dec(AV2, AV1, v2_avro).get("notes", "<missing>"))
attempt("new reader, old data, tip has NO default", lambda: avro_dec(AV1, AV2_NODEFAULT, v1_avro)["tip"])
attempt("reader guesses writer schema wrong (no registry)", lambda: avro_dec(AV2, None, v1_avro)["tip"])
