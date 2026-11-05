"""Show that b06's race is real and c02 is not: two couriers are offered the same order at the same moment.

A barrier inside store.get makes both attach calls read before either writes (the interleaving a busy
dispatcher hits by chance).

    python3 check_race.py
"""
import shutil
import subprocess
import sys

from prs import PRS
from review import build_repo

SCRIPT = '''
import sys, threading
sys.path[:0] = [".", "tests"]
from orders.models import Courier
from orders.service import OrderService
from orders.store import OrderStore
from test_service import ADDRESS, ITEMS, NOON, FakeNotifier, FakePayments

store = OrderStore()
svc = OrderService(store, FakePayments(), FakeNotifier(), {"CB1": {"fee_pence": 299}}, {})
order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
store.save_courier(Courier("courier_7"))
store.save_courier(Courier("courier_9"))

barrier = threading.Barrier(2, timeout=1)
real_get = store.get

def get_then_wait(order_id):
    row = real_get(order_id)
    try:
        barrier.wait()
    except threading.BrokenBarrierError:
        pass
    return row

store.get = get_then_wait
errors = []

def offer(courier_id):
    try:
        svc.attach(order.id, courier_id)
    except Exception as e:
        errors.append(type(e).__name__)

threads = [threading.Thread(target=offer, args=(c,)) for c in ("courier_7", "courier_9")]
for t in threads:
    t.start()
for t in threads:
    t.join()
chains = [c for c in ("courier_7", "courier_9") if order.id in store.get_courier(c).order_ids]
print(f"order in the chains of {chains}; order.courier_id={store.get(order.id).courier_id}; errors={errors}")
'''

for pr in PRS:
    if pr["id"] not in ("b06-chain-assign", "c02-chain-assign-safe"):
        continue
    root = build_repo(pr)
    try:
        (root / "race.py").write_text(SCRIPT)
        out = subprocess.run([sys.executable, "race.py"], cwd=root, capture_output=True, text=True, check=True)
        print(f"{pr['id']:22} {out.stdout.strip()}")
    finally:
        shutil.rmtree(root)
