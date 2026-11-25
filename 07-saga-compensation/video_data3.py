"""Write the data for week 6 Short "Who refunds the refund?".

Usage: python3 video_data3.py ../shorts/src/shorts/06-saga-compensation/data3.json
Asserts the numbers the Short speaks and shows ("32 times a year", "1,806 refunds", "two percent of refund tries
fail", 1,000 checkouts a day for a year) hold in the published summary (durable saga row). Standard library only.
"""
import json
import sys
from pathlib import Path

import simulate as sim

HERE = Path(__file__).resolve().parent
S = json.loads((HERE / "summary.json").read_text())
durable = S["Saga, durable state"]

assert sim.ORDERS_PER_DAY == 1_000 and sim.DAYS == 365
assert sim.P_REFUND_FAIL == 0.02  # "I assumed two percent of refund tries fail"
assert durable["refunds"] == 1806  # "a year of checkouts needed 1,806 refunds"
assert durable["failed_refund_attempts"] == 32  # "the refund itself failed 32 times a year"
assert durable["orphaned_charges"] == 0  # every failed try was retried and went through in the end

data = {
    "per_day": sim.ORDERS_PER_DAY,
    "days": sim.DAYS,
    "basket_pence": sim.BASKET_PENCE,
    "refund_fail_pct": round(sim.P_REFUND_FAIL * 100),
    "refunds": durable["refunds"],
    "failed_refund_tries": durable["failed_refund_attempts"],
    "orphaned_durable": durable["orphaned_charges"],
}
out = Path(sys.argv[1])
out.write_text(json.dumps(data, indent=1) + "\n")
print(out, data)
