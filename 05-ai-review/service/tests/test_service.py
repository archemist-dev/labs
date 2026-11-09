from datetime import datetime, timezone

import pytest

from orders.config import load_zones
from orders.models import PAID, Address, Courier, Item
from orders.notify import Outbox
from orders.reports import daily_revenue
from orders.service import OrderService
from orders.store import OrderStore

ADDRESS = Address("Anglia Ruskin University", "East Rd", "Cambridge", "CB1 1PT", 52.203889, 0.132917)
ITEMS = [
    Item("BG-CHEESE", "Cheeseburger", 1, 1199),
    Item("MX-TACOS", "Tacos", 2, 549),
    Item("DR-COLA", "Cola", 2, 199),
]
NOON = datetime(2026, 7, 1, 11, 0, tzinfo=timezone.utc)


class FakePayments:
    def __init__(self):
        self.charges = []

    def charge(self, order_id, amount_pence, idempotency_key):
        self.charges.append((order_id, amount_pence, idempotency_key))
        return "ch_1"


class FakeNotifier:
    def __init__(self):
        self.sent = []

    def send(self, to, text):
        self.sent.append((to, text))


class FakeStock:
    def __init__(self):
        self.reserved = {}

    def reserve(self, sku, qty):
        self.reserved[sku] = self.reserved.get(sku, 0) + qty

    def release(self, sku, qty):
        self.reserved[sku] -= qty


def make_service():
    return OrderService(OrderStore(), FakePayments(), FakeNotifier(), Outbox(), load_zones(),
                        promos={"TENOFF": {"percent": 10}}, stock=FakeStock())


def test_free_delivery_over_threshold():
    svc = make_service()
    order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
    assert order.subtotal_pence == 2695
    assert order.delivery_fee_pence == 0
    assert order.total_pence == 2695
    assert order.status == PAID


def test_closed_after_last_order_hour():
    svc = make_service()
    with pytest.raises(ValueError):
        svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=datetime(2026, 7, 1, 21, 30, tzinfo=timezone.utc))


def test_chain_onto_nearby_courier():
    svc = make_service()
    first = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
    svc.store.save_courier(Courier("courier_7"))
    svc.store.attach_order(first.id, "courier_7")
    svc.view.catch_up()
    second = svc.place_order("guest_2", ITEMS, ADDRESS, "CB1", now=NOON)
    assert svc.chain(second.id).courier_id == "courier_7"


def test_dispatch_texts_courier():
    svc = make_service()
    order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
    svc.store.save_courier(Courier("courier_7"))
    svc.store.attach_order(order.id, "courier_7")
    svc.advance(order.id, "PREPARING")
    svc.dispatch(order.id)
    assert svc.notifier.sent == [("courier_7", f"Pickup {order.id}: Anglia Ruskin University, CB1 1PT")]


def test_daily_revenue_counts_delivered_only():
    svc = make_service()
    order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
    assert daily_revenue([svc.store.get(order.id)]) == {}
