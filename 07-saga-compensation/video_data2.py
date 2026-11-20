"""Write the data for week 6 Short "Write the order first".

Usage: python3 video_data2.py ../shorts/src/shorts/06-saga-compensation/data2.json
Asserts the numbers the Short speaks and shows ("11 a day", "378 charges a year", "paid with no order: zero",
"refunds: zero", and the 3,997 / 2,182 / 1,806 on screen) hold in the published summary. Standard library only.
"""
import json
import sys
from pathlib import Path

import simulate as sim

HERE = Path(__file__).resolve().parent
S = json.loads((HERE / "summary.json").read_text())
once, keyed = S["Charge, then call once"], S["Retry + idempotency key"]
memory, durable, first = S["Saga, state in memory"], S["Saga, durable state"], S["Order first, then charge"]

assert sim.ORDERS_PER_DAY == 1_000 and sim.DAYS == 365
assert once["orphaned_charges"] == 3997 and round(once["orphaned_charges"] / sim.DAYS) == 11  # "that's 11 a day"
assert keyed["orphaned_charges"] == 2182
assert memory["orphaned_charges"] == 378  # "378 charges a year, with nothing behind them"
assert durable["orphaned_charges"] == 0 and durable["refunds"] == 1806
assert first["orphaned_charges"] == 0 and first["refunds"] == 0 and first["duplicate_orders"] == 0  # "zero ... zero"

data = {
    "per_day": sim.ORDERS_PER_DAY,
    "days": sim.DAYS,
    "basket_pence": sim.BASKET_PENCE,
    "orphaned_once": once["orphaned_charges"],
    "orphaned_once_per_day": round(once["orphaned_charges"] / sim.DAYS),
    "orphaned_key": keyed["orphaned_charges"],
    "orphaned_refund_step": memory["orphaned_charges"],
    "refunds_durable": durable["refunds"],
    "orphaned_order_first": first["orphaned_charges"],
    "refunds_order_first": first["refunds"],
}
out = Path(sys.argv[1])
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data["orphaned_once_per_day"], data["orphaned_refund_step"])
