"""Show that every seeded bug is real and every clean twin is not: the same scenario on both PRs.

    python3 check_bugs.py
"""
import shutil
import subprocess
import sys
import textwrap

from prs import PRS
from review import build_repo

SETUP = '''
import sys
sys.path[:0] = [".", "tests"]
from dataclasses import replace
from datetime import date, datetime, timezone
from orders.config import load_zones
from orders.http import Http
from orders.models import Courier, Item, Order
from orders.notify import Notifier
from orders.payments import PaymentClient
from test_service import ADDRESS, ITEMS, NOON, make_service

def at(lat, house):
    return replace(ADDRESS, house=house, lat=lat)

class Resp:
    def __init__(self, status, body=None, ok=True, error=""):
        self.status, self.body, self.ok, self.error = status, body or {}, ok, error
    def json(self):
        return self.body

class Provider:
    """Fake HTTP session. Every POST is applied by the provider, whatever status comes back."""
    def __init__(self, statuses, body=None):
        self.statuses, self.body, self.applied = list(statuses), body, 0
    def post(self, url, json, headers, timeout):
        self.applied += 1
        return Resp(self.statuses.pop(0), self.body)

import orders.http
if hasattr(orders.http, "time"):
    orders.http.time.sleep = lambda s: None
'''

SCENARIOS = {
    "01": '''
svc = make_service()
moved = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
far = svc.place_order("guest_2", ITEMS, at(52.2150, "Cambridge drop 2"), "CB1", now=NOON)
svc.store.save_courier(Courier("courier_7"))
svc.store.save_courier(Courier("courier_9"))
svc.store.attach_order(moved.id, "courier_7")
svc.store.attach_order(far.id, "courier_9")
svc.view.catch_up()
svc.store.detach_order(moved.id)           # dispatcher moves the order to courier_9
svc.store.attach_order(moved.id, "courier_9")
new = svc.place_order("guest_3", ITEMS, ADDRESS, "CB1", now=NOON)
got = svc.chain(new.id).courier_id
print(f"order moved from courier_7 to courier_9; new order next door chained to {got}")
''',
    "02": '''
provider = Provider([504, 200])           # first refund applied, answer lost; second applied too
result = PaymentClient(Http(provider, "https://psp")).refund("order_1", 1199)
print(f"refund of 1199 pence: provider applied {provider.applied} refund(s), client saw ok={result.ok}")
''',
    "03": '''
svc = make_service()
order = svc.place_order("guest_1", [Item("BG-CHEESE", "Cheeseburger", 1, 1199)], ADDRESS, "CB4", promo_code="TENOFF", now=NOON)
print(f"10% promo on a 1199 pence cheeseburger with {order.delivery_fee_pence} pence delivery: discount {order.discount_pence} pence")
''',
    "04": '''
from orders.reports import kitchen_summary
late = Order("o1", "guest_1", ITEMS, ADDRESS, "CB1", created_at=datetime(2026, 7, 1, 23, 30, tzinfo=timezone.utc),
             total_pence=2695, status="DELIVERED")
print(f"order at 00:30 London on 2 July; summary for 2 July: {kitchen_summary([late], date(2026, 7, 2))}")
''',
    "05": '''
class DownSMS:
    def send(self, to, text):
        return Resp(0, ok=False, error="timeout")
svc = make_service()
svc.notifier = Notifier(DownSMS())
order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
svc.store.save_courier(Courier("courier_7"))
svc.store.attach_order(order.id, "courier_7")
svc.advance(order.id, "PREPARING")
svc.dispatch(order.id)
print(f"SMS provider down at dispatch: {len(svc.outbox.pending)} message(s) queued for retry")
''',
    "06": '''
svc = make_service()
svc.payments = PaymentClient(Http(Provider([402], {"reason": "card_expired"}), "https://psp"))
try:
    svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
except Exception as e:
    error = type(e).__name__
order = next(iter(svc.store._orders.values()))
print(f"expired card: {error}; order left in {order.status}; items still reserved: {sum(svc.stock.reserved.values())}")
''',
    "07": '''
svc = make_service()
order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB4", now=NOON)
print(f"CB4 (no free-delivery offer), 2695 pence basket: delivery fee {order.delivery_fee_pence} pence")
''',
    "08": '''
svc = make_service()
order = svc.place_order("guest_1", [Item("BG-CHEESE", "Cheeseburger", 1, 1199)], ADDRESS, "CB4", now=NOON)
print(f"CB4 with surge on (349 + 150): delivery fee {order.delivery_fee_pence} pence")
''',
    "09": '''
svc = make_service()
order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
svc.store.save_courier(Courier("courier_7"))
svc.store.attach_order(order.id, "courier_7")
svc.advance(order.id, "PREPARING")
svc.dispatch(order.id)
returned = svc.pick_up(order.id, now=NOON)
print(f"pick_up returned {returned.picked_up_at:%H:%M}; stored picked_up_at: {svc.store.get(order.id).picked_up_at}")
''',
    "10": '''
svc = make_service()
first = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
second = svc.place_order("guest_2", ITEMS, at(52.2102, "Cambridge drop 2"), "CB1", now=NOON)
svc.store.save_courier(Courier("courier_7"))
svc.store.attach_order(first.id, "courier_7")
svc.store.attach_order(second.id, "courier_7")
svc.view.catch_up()
new = svc.place_order("guest_3", ITEMS, at(52.2165, "Cambridge drop 3"), "CB1", now=NOON)
chained = svc.chain(new.id)
print(f"new order 1.4 km from the chain's first order (limit 800 m): chained={chained is not None}")
''',
}


def run(pr, scenario) -> str:
    root = build_repo(pr)
    try:
        (root / "scenario.py").write_text(SETUP + textwrap.dedent(scenario))
        out = subprocess.run([sys.executable, "scenario.py"], cwd=root, capture_output=True, text=True)
        return out.stdout.strip() if out.returncode == 0 else "ERROR " + out.stderr.strip().splitlines()[-1]
    finally:
        shutil.rmtree(root)


def main():
    by_id = {p["id"]: p for p in PRS}
    for pr in (p for p in PRS if p["kind"] == "bug"):
        n = pr["id"][1:3]
        print(f"{n} {pr['id']:28} {run(pr, SCENARIOS[n])}")
        print(f"   {pr['twin']:28} {run(by_id[pr['twin']], SCENARIOS[n])}")


if __name__ == "__main__":
    main()
