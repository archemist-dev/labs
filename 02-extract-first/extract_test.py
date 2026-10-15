"""Which module should leave the monolith first? Run one typical order through a sample
monolith and measure, per module: the load on its tables, how tangled it is with the others
(tables shared, calls across modules) and whether it sits on the order-creation path.

Usage: python3 extract_test.py [copy|calls|joins]
  copy (default): the courier module copies the delivery point at assignment
  calls: it asks the orders module on every ETA refresh
  joins: it reads the orders table directly on every ETA refresh
Deterministic: simulated clock, in-memory SQLite, no timings. Two runs print the same numbers.
"""
import re
import sys
from collections import Counter, defaultdict

from monolith import couriers, db, menu, orders

MODULES = ("menu", "orders", "payments", "couriers", "notifications")

# Assumptions for one delivery, stated so they can be changed.
POSITION_EVERY_S = 10    # courier app sends a GPS point every 10 s
ETA_POLL_EVERY_S = 30    # guest app refreshes the ETA every 30 s
TO_RESTAURANT_MIN = 10   # courier assigned until pick-up
TO_GUEST_MIN = 15        # pick-up until DELIVERED

ADDRESS = {"street": "East Rd", "postcode": "CB1 1PT", "house": "Anglia Ruskin University",
           "city": "Cambridge", "lat": 52.203889, "lon": 0.132917}
COURIER_START = (52.2100, 0.1100)
RESTAURANT = (52.2053, 0.1218)

TABLE_RE = re.compile(r"\b(?:FROM|JOIN|INTO|UPDATE)\s+(\w+)", re.IGNORECASE)


def module_of(frame):
    name = frame.f_globals.get("__name__", "")
    if name.startswith("monolith.") and name != "monolith.db":
        return name.split(".", 1)[1]
    return None


class Recorder:
    def __init__(self):
        self.phase = None
        self.sql = Counter()      # (phase, caller module, table, read|write) -> statements
        self.calls = Counter()    # (phase, caller module, callee module, function) -> calls
        self.ran = defaultdict(set)  # phase -> modules whose code ran

    def on_sql(self, statement):
        if self.phase is None:
            return
        frame = sys._getframe(1)
        while frame and module_of(frame) is None:
            frame = frame.f_back
        caller = module_of(frame) if frame else "app"
        kind = "read" if statement.lstrip().upper().startswith("SELECT") else "write"
        for table in TABLE_RE.findall(statement):
            self.sql[(self.phase, caller, table, kind)] += 1

    def on_call(self, frame, event, arg):
        if event != "call" or self.phase is None:
            return
        callee = module_of(frame)
        if callee is None:
            return
        self.ran[self.phase].add(callee)
        caller = module_of(frame.f_back) if frame.f_back else None
        if caller and caller != callee:
            self.calls[(self.phase, caller, callee, frame.f_code.co_name)] += 1


def setup():
    db.init()
    pizza = menu.add_item("Margherita", 1199, [("Extra mozzarella", 150), ("Thin crust", 0)])
    bread = menu.add_item("Garlic bread", 449, [("Cheese", 100)])
    drink = menu.add_item("Lemonade 330 ml", 249)
    courier_id = couriers.add_courier("courier_7", "bike")
    return [(pizza, 1, [1]), (bread, 1, [3]), (drink, 2, [])], courier_id


def lerp(a, b, t):
    return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t


def deliver_one(rec, lines):
    rec.phase = "create"
    order_id = orders.create_order("guest_1", lines, ADDRESS)

    rec.phase = "fulfil"
    db.clock += 60
    orders.set_status(order_id, "COOKING")  # kitchen screen
    db.clock += 60
    courier_id = couriers.assign(order_id)
    legs = [(COURIER_START, RESTAURANT, TO_RESTAURANT_MIN), (RESTAURANT, (ADDRESS["lat"], ADDRESS["lon"]), TO_GUEST_MIN)]
    for leg, (start, end, minutes) in enumerate(legs):
        steps = minutes * 60 // POSITION_EVERY_S
        for step in range(steps):
            couriers.report_position(courier_id, order_id, *lerp(start, end, step / steps))
            if (step * POSITION_EVERY_S) % ETA_POLL_EVERY_S == 0:
                couriers.eta_minutes(order_id)  # guest app
            db.clock += POSITION_EVERY_S
        if leg == 0:
            couriers.pick_up(order_id)
    couriers.deliver(order_id)
    rec.phase = None
    return order_id


def plural(n, word):
    return f"{n} {word}" + ("" if n == 1 else "s")


def report(rec):
    sql = Counter()
    for (_, caller, table, kind), n in rec.sql.items():
        sql[(caller, table, kind)] += n
    calls = Counter()
    for (_, caller, callee, fn), n in rec.calls.items():
        calls[(caller, callee, fn)] += n
    on_create_tables = {t for (phase, _, t, _), n in rec.sql.items() if phase == "create"}

    print("## Per module, one typical order (3 items, 25-minute delivery)\n")
    print("| Module | Owns tables | Writes to its tables | Reads of its tables | Others' tables it touches "
          "| Its tables others touch | Calls out | Calls in | Seams to cut | On order creation |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    rows = []
    for m in MODULES:
        owned = sorted(t for t, o in db.OWNERS.items() if o == m)
        writes = sum(n for (c, t, k), n in sql.items() if t in owned and k == "write")
        reads = sum(n for (c, t, k), n in sql.items() if t in owned and k == "read")
        out_tables = {t for (c, t, k) in sql if c == m and db.OWNERS[t] != m}
        in_tables = {(c, t) for (c, t, k) in sql if c != m and t in owned}
        out_n = sum(n for (c, t, k), n in sql.items() if c == m and db.OWNERS[t] != m)
        in_n = sum(n for (c, t, k), n in sql.items() if c != m and t in owned)
        calls_out = sum(n for (c, _, _), n in calls.items() if c == m)
        calls_in = sum(n for (_, e, _), n in calls.items() if e == m)
        edges = {k for k in calls if m in k[:2]}
        seams = len({(m, t) for t in out_tables} | in_tables) + len(edges)
        creation = m in rec.ran["create"] or bool(on_create_tables & set(owned))
        rows.append((m, seams, writes))
        print(f"| {m} | {len(owned)} | {writes} | {reads} | {out_n} ({plural(len(out_tables), 'table')}) "
              f"| {in_n} ({plural(len(in_tables), 'link')}) | {calls_out} | {calls_in} | {seams} | {'yes' if creation else 'no'} |")

    print("\n## Writes and reads per table\n")
    print("| Table | Owner | Writes | Reads | Touched by |")
    print("| --- | --- | --- | --- | --- |")
    for table, owner in db.OWNERS.items():
        w = sum(n for (c, t, k), n in sql.items() if t == table and k == "write")
        r = sum(n for (c, t, k), n in sql.items() if t == table and k == "read")
        who = sorted({c for (c, t, k) in sql if t == table})
        print(f"| {table} | {owner} | {w} | {r} | {', '.join(who)} |")

    print("\n## Calls across modules (each becomes a network call after extraction)\n")
    print("| From | To | Function | Calls |")
    print("| --- | --- | --- | --- |")
    for (c, e, fn), n in sorted(calls.items()):
        print(f"| {c} | {e} | {fn} | {n} |")

    print("\nSeams to cut = distinct cross-module table links (either direction) + distinct cross-module functions called.")
    print(f"Assumptions: GPS point every {POSITION_EVERY_S} s, ETA refresh every {ETA_POLL_EVERY_S} s, "
          f"{TO_RESTAURANT_MIN} min to the restaurant, {TO_GUEST_MIN} min to the guest.")
    return rows


def run():
    """Deliver one order with recording on; returns the Recorder."""
    lines, _ = setup()
    rec = Recorder()
    db.conn.set_trace_callback(rec.on_sql)
    sys.setprofile(rec.on_call)
    try:
        deliver_one(rec, lines)
    finally:
        sys.setprofile(None)
        db.conn.set_trace_callback(None)
    return rec


def main():
    couriers.ORDER_DATA = sys.argv[1] if len(sys.argv) > 1 else "copy"
    if couriers.ORDER_DATA not in ("copy", "calls", "joins"):
        sys.exit("usage: python3 extract_test.py [copy|calls|joins]")
    rec = run()
    print(f"Courier module gets the delivery point by: {couriers.ORDER_DATA}")
    (status,) = db.one("SELECT status FROM orders")
    history = [s for (s,) in db.conn.execute("SELECT status FROM order_status_history ORDER BY rowid")]
    print(f"Order status: {status}; history: {' > '.join(history)}\n")
    report(rec)


if __name__ == "__main__":
    main()
