import logging
import uuid
from datetime import datetime, timezone

from . import chain, flags, money
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
from .notify import NotifyError
from .payments import PaymentError
from .reports import LONDON
from .store import ConflictError
from .views import CourierView

log = logging.getLogger(__name__)

LAST_ORDER_HOUR = 22  # London time


class OrderService:
    def __init__(self, store, payments, notifier, outbox, zones, promos, stock):
        self.store = store
        self.payments = payments
        self.notifier = notifier
        self.outbox = outbox
        self.zones = zones  # name -> config.Zone
        self.promos = promos  # code -> {"percent": int}
        self.stock = stock
        self.view = CourierView(store)

    def place_order(self, guest_id, items, address, zone_name, promo_code=None, now=None) -> Order:
        now = now or datetime.now(timezone.utc)
        if not self.accepting_orders(now):
            raise ValueError("kitchen closed")
        if zone_name not in self.zones:
            raise ValueError(f"unknown zone: {zone_name}")
        zone = self.zones[zone_name]
        order = Order(id=str(uuid.uuid4()), guest_id=guest_id, items=items, address=address, zone=zone_name,
                      created_at=now)
        order.subtotal_pence = money.subtotal(items)
        order.delivery_fee_pence = money.delivery_fee(zone, order.subtotal_pence, surge=flags.enabled("surge_fee"))
        if promo_code:
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
        order.total_pence = order.subtotal_pence + order.delivery_fee_pence - order.discount_pence
        self.store.save(order)

        for item in items:
            self.stock.reserve(item.sku, item.qty)
        try:
            self.payments.charge(order.id, order.total_pence, idempotency_key=order.id)
        except PaymentError:
            for item in items:
                self.stock.release(item.sku, item.qty)
            self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
            raise
        return self.store.update_status(order.id, CREATED, PAID)

    def accepting_orders(self, now) -> bool:
        return now.astimezone(LONDON).hour < LAST_ORDER_HOUR

    def advance(self, order_id, new_status) -> Order:
        order = self.store.get(order_id)
        if new_status not in TRANSITIONS[order.status]:
            raise ValueError(f"{order.status} -> {new_status} not allowed")
        return self.store.update_status(order_id, order.status, new_status)

    def chain(self, order_id) -> Order | None:
        """Try to put a new order onto a courier already on a trip. None: no courier nearby, dispatch as usual."""
        if not flags.enabled("chain_orders"):
            return None
        order = self.store.get(order_id)
        courier_id = chain.pick_courier(self.store, order)
        if courier_id is None:
            return None
        try:
            return self.store.attach_order(order_id, courier_id)
        except ConflictError:
            return None  # the courier filled up or the order was taken meanwhile

    def dispatcher_screen(self) -> dict[str, list[str]]:
        return {courier_id: self.view.chain(courier_id) for courier_id in self.view.courier_ids()}

    def dispatch(self, order_id) -> Order:
        order = self.advance(order_id, OUT_FOR_DELIVERY)
        text = f"Pickup {order.id}: {order.address.house}, {order.address.postcode}"
        try:
            self.notifier.send(order.courier_id, text)
        except NotifyError:
            log.warning("courier sms failed for %s, queued for retry", order.id)
            self.outbox.add(order.courier_id, text)
        return order

    def deliver(self, order_id) -> Order:
        return self.advance(order_id, DELIVERED)

    def cancel(self, order_id) -> Order:
        order = self.store.get(order_id)
        if CANCELLED not in TRANSITIONS[order.status]:
            raise ValueError(f"cannot cancel order in {order.status}")
        result = self.payments.refund(order.id, order.total_pence)
        if not result.ok:
            raise RuntimeError(f"refund failed for {order.id}: {result.reason}")
        return self.store.update_status(order_id, order.status, CANCELLED)
