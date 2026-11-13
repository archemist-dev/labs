"""The card was charged. Does the order exist?

One checkout = two services with no shared transaction: the payment provider charges the card,
then the order service creates the order. This lab replays a day of checkouts with injected faults
and counts what each strategy leaves behind: orphaned charges (money taken, no order, no refund),
duplicate orders, refunds, and orders still unresolved at the end of the day.

Usage: python3 simulate.py
Standard library only, fixed seeds: two runs print the same output on any machine.
"""
import json
import random
from pathlib import Path

ORDERS_PER_DAY = 1_000          # a small delivery app
DAYS = 365                      # one year, counted, not extrapolated
BASKET_PENCE = 1947             # 2 items + delivery: £11.99 + £4.49 + £2.99

# Fault model (assumptions, stated in the README):
P_TIMEOUT = 0.01                # create-order call times out
P_TIMEOUT_BUT_DONE = 0.5        # ...and the order was created anyway (the reply was lost)
P_REJECT = 0.005                # order service says no (slot gone, item sold out, validation)
P_CRASH = 0.001                 # the checkout process dies right after the charge
P_REFUND_FAIL = 0.02            # a refund call fails (provider error), per attempt
RETRIES = 3                     # attempts for a forward retry or a refund, per run of the saga
RECOVERY_RUNS = 5               # a durable saga is resumed this many times in a day after a crash or a failed refund

HERE = Path(__file__).parent


class World:
    def __init__(self, rng):
        self.rng = rng
        self.orders = {}         # checkout id -> number of orders created
        self.charged = set()
        self.refunded = set()

    def charge(self, cid):
        self.charged.add(cid)

    def create_order(self, cid, key=None):
        """Returns 'ok', 'rejected' or 'timeout'. A timeout may still have created the order."""
        if cid in self.rejected_ids:
            return "rejected"
        if key is not None and self.orders.get(cid, 0) > 0:
            return "ok"          # idempotency key: the order already exists, return it
        if self.rng.random() < P_TIMEOUT:
            if self.rng.random() < P_TIMEOUT_BUT_DONE:
                self.orders[cid] = self.orders.get(cid, 0) + 1
            return "timeout"
        self.orders[cid] = self.orders.get(cid, 0) + 1
        return "ok"

    def refund(self, cid):
        if self.rng.random() < P_REFUND_FAIL:
            return False
        self.refunded.add(cid)
        return True


def naive(w, cid, crashed):
    """Charge, call create-order once, show an error if it fails. Nothing else."""
    w.charge(cid)
    if crashed:
        return
    w.create_order(cid)


def retry(w, cid, crashed, key):
    """Charge, then retry create-order on a timeout. With `key`, every attempt carries the same idempotency key."""
    w.charge(cid)
    if crashed:
        return
    for _ in range(RETRIES):
        r = w.create_order(cid, key=cid if key else None)
        if r != "timeout":
            return


def saga(w, cid, crashed, durable):
    """Orchestrated saga: idempotent forward retries; a rejection or exhausted retries triggers a refund.
    `durable`: the saga's state is stored before each step, so a crash or a failed refund is resumed later."""
    w.charge(cid)
    runs = 1 + (RECOVERY_RUNS if durable else 0)
    for run in range(runs):
        if crashed and run == 0:
            continue             # the process died after the charge; only a stored saga comes back
        outcome = None
        for _ in range(RETRIES):
            r = w.create_order(cid, key=cid)
            if r != "timeout":
                outcome = r
                break
        if outcome == "ok":
            return
        if outcome is None and w.orders.get(cid, 0) > 0:
            return               # unknown, but a later run finds the order: keep it
        if outcome is None and run < runs - 1:
            continue             # still unknown: don't refund yet, ask again on the next run
        for _ in range(RETRIES):
            if w.refund(cid):
                return


STRATEGIES = {
    "Charge, then call once": lambda w, c, x: naive(w, c, x),
    "Retry on timeout": lambda w, c, x: retry(w, c, x, key=False),
    "Retry + idempotency key": lambda w, c, x: retry(w, c, x, key=True),
    "Saga, state in memory": lambda w, c, x: saga(w, c, x, durable=False),
    "Saga, durable state": lambda w, c, x: saga(w, c, x, durable=True),
}


def run(name, fn):
    totals = {"orphaned_charges": 0, "duplicate_orders": 0, "refunds": 0, "orders": 0}
    for day in range(DAYS):
        rng = random.Random(f"{name}-{day}")
        faults = random.Random(f"faults-{day}")  # same checkouts, same rejections and crashes for every strategy
        w = World(rng)
        w.rejected_ids = {c for c in range(ORDERS_PER_DAY) if faults.random() < P_REJECT}
        crashes = {c for c in range(ORDERS_PER_DAY) if faults.random() < P_CRASH}
        for cid in range(ORDERS_PER_DAY):
            fn(w, cid, cid in crashes)
        for cid in w.charged:
            n = w.orders.get(cid, 0)
            if n == 0 and cid not in w.refunded:
                totals["orphaned_charges"] += 1
            totals["duplicate_orders"] += max(0, n - 1)
            totals["orders"] += min(n, 1)
        totals["refunds"] += len(w.refunded)
    year = dict(totals)
    year["orphaned_pounds"] = round(totals["orphaned_charges"] * BASKET_PENCE / 100)
    year["duplicate_pounds"] = round(totals["duplicate_orders"] * BASKET_PENCE / 100)
    return year


def main():
    print(f"{ORDERS_PER_DAY:,} checkouts a day for {DAYS} days ({ORDERS_PER_DAY * DAYS:,} in total), basket £{BASKET_PENCE / 100:.2f}. "
          f"Create-order: {P_TIMEOUT:.1%} time out ({P_TIMEOUT_BUT_DONE:.0%} of those created anyway), "
          f"{P_REJECT:.1%} rejected. Process crash after the charge: {P_CRASH:.1%}. "
          f"Refund fails {P_REFUND_FAIL:.0%} per attempt.\n")
    print("Totals for the year:")
    print(f"{'Strategy':<26} {'Orphaned charges':>17} {'Duplicate orders':>17} {'Refunds':>8} "
          f"{'Orphaned £':>11} {'Duplicate £':>12}")
    out = {}
    for name, fn in STRATEGIES.items():
        r = out[name] = run(name, fn)
        print(f"{name:<26} {r['orphaned_charges']:>17,} {r['duplicate_orders']:>17,} {r['refunds']:>8,} "
              f"{r['orphaned_pounds']:>11,} {r['duplicate_pounds']:>12,}")
    (HERE / "summary.json").write_text(json.dumps(out, indent=2) + "\n")


if __name__ == "__main__":
    main()
