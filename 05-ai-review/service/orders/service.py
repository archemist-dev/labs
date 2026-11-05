import logging
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from . import money
from .models import (
    CANCELLED,
    CREATED,
    DELIVERED,
    OUT_FOR_DELIVERY,
    PAID,
    PAYMENT_FAILED,
    TRANSITIONS,
    Order,
)
from .payments import PaymentError

log = logging.getLogger(__name__)

LONDON = ZoneInfo("Europe/London")
LAST_ORDER_HOUR = 22


class OrderService:
    def __init__(self, store, payments, notifier, zones, promos):
        self.store = store
        self.payments = payments
        self.notifier = notifier
        self.zones = zones  # zone -> {"fee_pence": int}
        self.promos = promos  # code -> {"percent": int}

    def place_order(self, guest_id, items, address, zone, promo_code=None, now=None) -> Order:
        if not self.accepting_orders(now):
            raise ValueError("kitchen closed")
        if zone not in self.zones:
            raise ValueError(f"unknown zone: {zone}")
        order = Order(id=str(uuid.uuid4()), guest_id=guest_id, items=items, address=address, zone=zone)
        order.subtotal_pence = money.subtotal(items)
        order.delivery_fee_pence = self.zones[zone]["fee_pence"]
        if promo_code:
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
        order.total_pence = order.subtotal_pence + order.delivery_fee_pence - order.discount_pence
        self.store.save(order)

        try:
            self.payments.charge(order.id, order.total_pence, idempotency_key=order.id)
        except PaymentError:
            self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
            raise
        return self.store.update_status(order.id, CREATED, PAID)

    def accepting_orders(self, now=None) -> bool:
        now = now or datetime.now(LONDON)
        return now.astimezone(LONDON).hour < LAST_ORDER_HOUR

    def advance(self, order_id, new_status) -> Order:
        order = self.store.get(order_id)
        if new_status not in TRANSITIONS[order.status]:
            raise ValueError(f"{order.status} -> {new_status} not allowed")
        return self.store.update_status(order_id, order.status, new_status)

    def dispatch(self, order_id, courier_id) -> Order:
        order = self.advance(order_id, OUT_FOR_DELIVERY)
        order.courier_id = courier_id
        self.notifier.send(courier_id, f"Pickup {order.id}: {order.address.house}, {order.address.postcode}")
        return order

    def deliver(self, order_id) -> Order:
        return self.advance(order_id, DELIVERED)
