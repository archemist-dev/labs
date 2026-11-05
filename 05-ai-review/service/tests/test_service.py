from datetime import datetime

import pytest

from orders.models import PAID, Address, Item
from orders.service import LONDON, OrderService
from orders.store import OrderStore

ADDRESS = Address("Anglia Ruskin University", "East Rd", "Cambridge", "CB1 1PT", 52.203889, 0.132917)
ITEMS = [Item("PZ-MARG", "Margherita", 1, 1199), Item("SD-WINGS", "Wings", 2, 549), Item("DR-COLA", "Cola", 1, 199)]
NOON = datetime(2026, 7, 1, 12, 0, tzinfo=LONDON)


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


def make_service():
    return OrderService(
        OrderStore(), FakePayments(), FakeNotifier(),
        zones={"CB1": {"fee_pence": 299}}, promos={"TENOFF": {"percent": 10}},
    )


def test_place_order_charges_total_in_pence():
    svc = make_service()
    order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", promo_code="TENOFF", now=NOON)
    assert order.subtotal_pence == 2496
    assert order.discount_pence == 249
    assert order.total_pence == 2496 + 299 - 249
    assert order.status == PAID


def test_closed_after_last_order_hour():
    svc = make_service()
    with pytest.raises(ValueError):
        svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=datetime(2026, 7, 1, 22, 30, tzinfo=LONDON))
