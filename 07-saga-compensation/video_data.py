"""Write the data for week 6 Short "The retry that doubled orders".

Usage: python3 video_data.py ../shorts/src/shorts/07-saga-compensation/data.json
Asserts the numbers the Short speaks ("1,869 double orders a year", "a thousand a day", "one percent timing out",
"about £36,000 of food", "double orders: zero" with the key) hold in the published summary. Standard library only.
"""
import json
import sys
from pathlib import Path

import simulate as sim

HERE = Path(__file__).resolve().parent
S = json.loads((HERE / "summary.json").read_text())
retry, keyed = S["Retry on timeout"], S["Retry + idempotency key"]

assert sim.ORDERS_PER_DAY == 1_000 and sim.DAYS == 365 and sim.P_TIMEOUT == 0.01  # "a thousand a day, one percent"
assert retry["duplicate_orders"] == 1869  # "1,869 double orders a year"
assert retry["duplicate_pounds"] == 1869 * sim.BASKET_PENCE // 100 == 36389  # "about £36,000 of food"
assert keyed["duplicate_orders"] == 0  # "Double orders: zero"

data = {
    "per_day": sim.ORDERS_PER_DAY,
    "days": sim.DAYS,
    "checkouts": sim.ORDERS_PER_DAY * sim.DAYS,
    "timeout_pct": round(sim.P_TIMEOUT * 100),
    "lost_reply_pct": round(sim.P_TIMEOUT_BUT_DONE * 100),
    "basket_pence": sim.BASKET_PENCE,
    "duplicates": retry["duplicate_orders"],
    "duplicate_pounds": retry["duplicate_pounds"],
    "duplicates_with_key": keyed["duplicate_orders"],
}
out = Path(sys.argv[1])
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data["duplicates"], data["duplicate_pounds"])
