"""The 20 pull requests reviewed in this lab, as edits to service/.

kind "bug": one seeded silent failure; `bug` says what it is (the judge sees it, the reviewer never does).
kind "clean": no defect; `note` says what looks odd but is intended (the judge sees it, the reviewer never does).
Each edit is (path, old, new): `old` must occur exactly once in the base file; old=None creates the file.
"""

CHARGE_BLOCK = """        try:
            self.payments.charge(order.id, order.total_pence, idempotency_key=order.id)
        except PaymentError:
            self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
            raise
        return self.store.update_status(order.id, CREATED, PAID)
"""

NOTIFY_LINE = """        self.notifier.send(courier_id, f"Pickup {order.id}: {order.address.house}, {order.address.postcode}")
        return order
"""

DELIVER = """    def deliver(self, order_id) -> Order:
        return self.advance(order_id, DELIVERED)
"""

PRS = [
    # ---------- seeded silent failures ----------
    {
        "id": "b01-swallowed-notify",
        "kind": "bug",
        "title": "Don't fail dispatch when the courier SMS provider is flaky",
        "body": "The SMS provider times out a few times a day and dispatch blows up with a 500 even though the order "
                "was already moved to OUT_FOR_DELIVERY. Catch the error and log it so dispatch completes.",
        "bug": "Swallowed exception: if notifier.send fails, the error is only logged and dispatch returns success. "
               "The order is OUT_FOR_DELIVERY but the courier was never told; no retry, no alert, nothing fails.",
        "edits": [("orders/service.py", NOTIFY_LINE, """        try:
            self.notifier.send(courier_id, f"Pickup {order.id}: {order.address.house}, {order.address.postcode}")
        except Exception as e:
            log.warning("courier notify failed for %s: %s", order.id, e)
        return order
""")],
    },
    {
        "id": "b02-retry-new-key",
        "kind": "bug",
        "title": "Retry the card charge on provider timeout",
        "body": "The card provider sometimes times out under load. Retry up to 3 times before giving up.",
        "bug": "Retry without idempotency: each attempt sends a new random idempotency key, so a timeout on a charge "
               "that actually went through is charged again. The guest pays twice; the order looks normal.",
        "edits": [
            ("orders/service.py", "from .payments import PaymentError\n",
             "from .payments import PaymentError, PaymentTimeout\n"),
            ("orders/service.py", CHARGE_BLOCK, """        for attempt in range(3):
            try:
                self.payments.charge(order.id, order.total_pence, idempotency_key=str(uuid.uuid4()))
                break
            except PaymentTimeout:
                log.info("charge timeout for %s, attempt %d", order.id, attempt + 1)
                if attempt == 2:
                    raise
            except PaymentError:
                self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
                raise
        return self.store.update_status(order.id, CREATED, PAID)
"""),
        ],
    },
    {
        "id": "b03-default-fee",
        "kind": "bug",
        "title": "Read zone pricing from the new config service",
        "body": "Zones now come from the config service, which can return partial entries while a zone is being set "
                "up. Use .get so a half-configured zone doesn't crash checkout.",
        "bug": "Wrong default on a missing value: a zone without fee_pence gets a delivery fee of 0, and unknown zones "
               "are no longer rejected. Orders go through with free delivery and no error or log.",
        "edits": [("orders/service.py", """        if zone not in self.zones:
            raise ValueError(f"unknown zone: {zone}")
""", ""), ("orders/service.py", """        order.delivery_fee_pence = self.zones[zone]["fee_pence"]
""", """        order.delivery_fee_pence = self.zones.get(zone, {}).get("fee_pence", 0)
""")],
    },
    {
        "id": "b04-utc-cutoff",
        "kind": "bug",
        "title": "Use UTC for the last-order check",
        "body": "New servers run in UTC and ZoneInfo needs tzdata in the slim image. Simplify the cut-off to UTC.",
        "bug": "Timezone cut-off: the last-order hour (22, London time) is now compared with the UTC hour. During "
               "British Summer Time the kitchen accepts orders until 23:00 local, an hour after closing. No error.",
        "edits": [("orders/service.py", """        now = now or datetime.now(LONDON)
        return now.astimezone(LONDON).hour < LAST_ORDER_HOUR
""", """        now = now or datetime.utcnow()
        return now.hour < LAST_ORDER_HOUR
""")],
    },
    {
        "id": "b05-float-discount",
        "kind": "bug",
        "title": "Simplify percent_off",
        "body": "Readability: write the discount as amount times a fraction, the way the receipt describes it. "
                "Same results for our promos (tests pass).",
        "bug": "Float money: amount * (percent / 100) goes through a float and int() truncates, so some discounts "
               "lose a penny (29% of 100 pence is 28.999... and becomes 28, not 29). The existing test still "
               "passes; totals drift silently.",
        "edits": [("orders/money.py", """    return amount_pence * percent // 100
""", """    return int(amount_pence * (percent / 100))
""")],
    },
    {
        "id": "b06-chain-assign",
        "kind": "bug",
        "title": "Chain orders onto couriers already on a trip",
        "body": "Couriers on a trip can take more orders from the same area, up to their max_orders. Adds "
                "OrderService.attach to put an order onto a courier's chain.",
        "bug": "Race on chaining: attach reads the order and the courier, checks them, then writes both, with no lock "
               "or compare-and-set across the check and the write. Two attach calls at the same moment (the same "
               "order offered to two couriers, or two orders to one courier) both pass the checks: the order ends "
               "up in two couriers' chains, so one courier carries an order that isn't theirs, or a courier goes "
               "over max_orders. Every call returns success.",
        "edits": [("orders/service.py", DELIVER, DELIVER + """
    def attach(self, order_id, courier_id) -> Order:
        courier = self.store.get_courier(courier_id)
        if len(courier.order_ids) >= courier.max_orders:
            raise ValueError(f"courier {courier_id} is full")
        order = self.store.get(order_id)
        if order.courier_id is not None:
            raise ValueError(f"order {order_id} already has a courier")
        order.courier_id = courier_id
        courier.order_ids.append(order_id)
        self.store.save(order)
        self.store.save_courier(courier)
        return order
""")],
    },
    {
        "id": "b07-unchecked-refund",
        "kind": "bug",
        "title": "Refund automatically when the kitchen rejects an order",
        "body": "Kitchens can reject a paid order (out of an item). Cancel it and refund the guest in one step.",
        "bug": "Unchecked return value: payments.refund returns RefundResult(ok=False) on failure instead of raising. "
               "reject ignores it, so the order is CANCELLED and the guest is never refunded. No error, no log.",
        "edits": [("orders/service.py", DELIVER, DELIVER + """
    def reject(self, order_id, reason) -> Order:
        order = self.store.update_status(order_id, PAID, CANCELLED)
        self.payments.refund(order.id, order.total_pence)
        log.info("order %s rejected by kitchen: %s", order.id, reason)
        return order
""")],
    },
    {
        "id": "b08-stock-leak",
        "kind": "bug",
        "title": "Reserve stock before charging",
        "body": "Stops overselling limited items: reserve each item's stock before taking payment.",
        "bug": "Partial write without rollback: stock is reserved, then the charge is declined and the order is "
               "marked PAYMENT_FAILED, but the reservation is never released. Items slowly show as sold out.",
        "edits": [
            ("orders/service.py", """    def __init__(self, store, payments, notifier, zones, promos):
        self.store = store
""", """    def __init__(self, store, payments, notifier, zones, promos, stock):
        self.store = store
        self.stock = stock
"""),
            ("orders/service.py", CHARGE_BLOCK, """        for item in items:
            self.stock.reserve(item.sku, item.qty)

""" + CHARGE_BLOCK),
            ("tests/test_service.py", """def make_service():
    return OrderService(
        OrderStore(), FakePayments(), FakeNotifier(),
        zones={"CB1": {"fee_pence": 299}}, promos={"TENOFF": {"percent": 10}},
    )
""", """class FakeStock:
    def __init__(self):
        self.reserved = []

    def reserve(self, sku, qty):
        self.reserved.append((sku, qty))


def make_service():
    return OrderService(
        OrderStore(), FakePayments(), FakeNotifier(),
        zones={"CB1": {"fee_pence": 299}}, promos={"TENOFF": {"percent": 10}}, stock=FakeStock(),
    )
"""),
        ],
    },
    {
        "id": "b09-health-always-ok",
        "kind": "bug",
        "title": "Add a /health handler for the load balancer",
        "body": "The load balancer needs a health check. Returns the store status so we can see it in the dashboard.",
        "bug": "Fallback hides an outage: when the store is down the handler logs and still returns HTTP 200 with "
               "status ok, so the load balancer keeps sending traffic to a broken instance.",
        "edits": [("orders/health.py", None, """import logging

log = logging.getLogger(__name__)


def health(store):
    try:
        store.ping()
        return 200, {"status": "ok", "store": "up"}
    except Exception:
        log.exception("store ping failed")
        return 200, {"status": "ok", "store": "degraded"}
""")],
    },
    {
        "id": "b10-broad-except-charge",
        "kind": "bug",
        "title": "Mark the order failed on any payment problem",
        "body": "Orders were left stuck in CREATED when the provider threw something other than PaymentError. Handle "
                "every error so the order always ends in a final state.",
        "bug": "Broad except around the charge: a PaymentTimeout (outcome unknown, the charge may have gone through) "
               "is treated as a decline. The order is marked PAYMENT_FAILED although the guest may have been "
               "charged; the guest retries and pays twice, or pays for nothing.",
        "edits": [("orders/service.py", """        except PaymentError:
            self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
            raise
""", """        except Exception as e:
            self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
            raise PaymentError(str(e)) from e
""")],
    },
    # ---------- clean controls ----------
    {
        "id": "c01-extract-pricing",
        "kind": "clean",
        "title": "Extract pricing from place_order",
        "body": "No behaviour change. Moves the price math into _price so the upcoming quote endpoint can reuse it.",
        "note": "Pure refactor; same arithmetic, same order of operations.",
        "edits": [("orders/service.py", """        order.subtotal_pence = money.subtotal(items)
        order.delivery_fee_pence = self.zones[zone]["fee_pence"]
        if promo_code:
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
        order.total_pence = order.subtotal_pence + order.delivery_fee_pence - order.discount_pence
""", """        self._price(order, promo_code)
"""), ("orders/service.py", """    def accepting_orders(self, now=None) -> bool:
""", """    def _price(self, order, promo_code) -> None:
        order.subtotal_pence = money.subtotal(order.items)
        order.delivery_fee_pence = self.zones[order.zone]["fee_pence"]
        if promo_code:
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
        order.total_pence = order.subtotal_pence + order.delivery_fee_pence - order.discount_pence

    def accepting_orders(self, now=None) -> bool:
""")],
    },
    {
        "id": "c02-chain-assign-safe",
        "kind": "clean",
        "title": "Chain orders onto couriers already on a trip",
        "body": "Couriers on a trip can take more orders from the same area, up to their max_orders. The check and "
                "the write happen in one store call under the store's lock, so two offers at once can't both win.",
        "note": "Check and write are atomic under the store lock on the stored objects; a losing concurrent attach "
                "gets ConflictError.",
        "edits": [("orders/store.py", """    def ping(self) -> None:""", """    def attach_order(self, order_id: str, courier_id: str) -> Order:
        \"\"\"Chain an order onto a courier's trip, atomically.\"\"\"
        with self._lock:
            order = self._orders[order_id]
            courier = self._couriers[courier_id]
            if order.courier_id is not None:
                raise ConflictError(f"{order_id} already has courier {order.courier_id}")
            if len(courier.order_ids) >= courier.max_orders:
                raise ConflictError(f"courier {courier_id} is full")
            order.courier_id = courier_id
            courier.order_ids.append(order_id)
            return order

    def ping(self) -> None:"""), ("orders/service.py", DELIVER, DELIVER + """
    def attach(self, order_id, courier_id) -> Order:
        return self.store.attach_order(order_id, courier_id)
""")],
    },
    {
        "id": "c03-cancel-safe",
        "kind": "clean",
        "title": "Let guests cancel before the order leaves the kitchen",
        "body": "Adds OrderService.cancel. Uses the compare-and-set transition so a concurrent dispatch wins, and "
                "only cancels after the refund is confirmed.",
        "note": "Status change goes through advance (compare-and-set), refund result is checked. The broad "
                "except logs and re-raises on purpose: it adds the order id to the log, nothing is swallowed. If the "
                "refund fails the order stays in its status and the error reaches the caller.",
        "edits": [("orders/service.py", DELIVER, DELIVER + """
    def cancel(self, order_id) -> Order:
        order = self.store.get(order_id)
        if CANCELLED not in TRANSITIONS[order.status]:
            raise ValueError(f"cannot cancel order in {order.status}")
        try:
            result = self.payments.refund(order.id, order.total_pence)
        except Exception:
            log.exception("refund call failed for %s", order.id)
            raise
        if not result.ok:
            raise RuntimeError(f"refund failed for {order.id}: {result.reason}")
        return self.store.update_status(order_id, order.status, CANCELLED)
""")],
    },
    {
        "id": "c04-retry-same-key",
        "kind": "clean",
        "title": "Retry the card charge on provider timeout",
        "body": "The provider dedupes by idempotency key, so retrying with the order id as the key is safe: a charge "
                "that went through is returned, not repeated.",
        "note": "Same idempotency key (order id) on every attempt; after 3 timeouts the timeout is re-raised and the "
                "order stays CREATED (outcome unknown, not marked failed).",
        "edits": [
            ("orders/service.py", "from .payments import PaymentError\n",
             "from .payments import PaymentError, PaymentTimeout\n"),
            ("orders/service.py", CHARGE_BLOCK, """        for attempt in range(3):
            try:
                self.payments.charge(order.id, order.total_pence, idempotency_key=order.id)
                break
            except PaymentTimeout:
                log.info("charge timeout for %s, attempt %d", order.id, attempt + 1)
                if attempt == 2:
                    raise
            except PaymentError:
                self.store.update_status(order.id, CREATED, PAYMENT_FAILED)
                raise
        return self.store.update_status(order.id, CREATED, PAID)
"""),
        ],
    },
    {
        "id": "c05-disabled-promo",
        "kind": "clean",
        "title": "Support paused promo codes",
        "body": "Marketing pauses a promo by setting its percent to null. A paused code applies no discount instead "
                "of crashing. Unknown codes still fail.",
        "note": "percent None means paused by design (documented in the PR); unknown codes still raise.",
        "edits": [("orders/service.py", """        if promo_code:
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
""", """        if promo_code:
            if promo_code not in self.promos:
                raise ValueError(f"unknown promo: {promo_code}")
            percent = self.promos[promo_code]["percent"]  # None = paused by marketing
            if percent is not None:
                order.discount_pence = money.percent_off(order.subtotal_pence, percent)
""")],
    },
    {
        "id": "c06-cutoff-per-kitchen",
        "kind": "clean",
        "title": "Last-order hour per kitchen",
        "body": "Kitchens can close at different hours. Default stays 22:00 London time.",
        "note": "Still London local time; the default is unchanged.",
        "edits": [("orders/service.py", """    def accepting_orders(self, now=None) -> bool:
        now = now or datetime.now(LONDON)
        return now.astimezone(LONDON).hour < LAST_ORDER_HOUR
""", """    def accepting_orders(self, now=None, last_order_hour=LAST_ORDER_HOUR) -> bool:
        now = now or datetime.now(LONDON)
        return now.astimezone(LONDON).hour < last_order_hour
""")],
    },
    {
        "id": "c07-basis-points",
        "kind": "clean",
        "title": "Discounts in basis points",
        "body": "Finance wants 12.5% promos. Adds bps_off next to percent_off, integer pence, rounded down like "
                "percent_off.",
        "note": "Integer math, floor rounding in the guest's favour, same convention as percent_off.",
        "edits": [("orders/money.py", """    return amount_pence * percent // 100
""", """    return amount_pence * percent // 100


def bps_off(amount_pence: int, bps: int) -> int:
    \"\"\"Discount in basis points (1250 = 12.5%), rounded down like percent_off.\"\"\"
    if not 0 <= bps <= 10_000:
        raise ValueError(f"bps out of range: {bps}")
    return amount_pence * bps // 10_000
""")],
    },
    {
        "id": "c08-dispatch-test",
        "kind": "clean",
        "title": "Test that dispatch notifies the courier",
        "body": "Test only.",
        "note": "Adds a test; no production code.",
        "edits": [("tests/test_service.py", """def test_closed_after_last_order_hour():
""", """def test_dispatch_notifies_courier():
    svc = make_service()
    order = svc.place_order("guest_1", ITEMS, ADDRESS, "CB1", now=NOON)
    svc.advance(order.id, "PREPARING")
    svc.dispatch(order.id, "courier_7")
    assert svc.notifier.sent == [("courier_7", f"Pickup {order.id}: Anglia Ruskin University, CB1 1PT")]


def test_closed_after_last_order_hour():
""")],
    },
    {
        "id": "c09-guest-sms-best-effort",
        "kind": "clean",
        "title": "Text the guest when the order is on its way",
        "body": "Best-effort SMS to the guest after dispatch. The courier notification still fails loudly; the guest "
                "text is optional (the app shows the status anyway), so its failure is logged and does not undo "
                "dispatch.",
        "note": "Swallowing is intended and stated: the guest SMS is optional, the order state is already "
                "committed, the failure is logged, and the courier notify above it still raises.",
        "edits": [("orders/service.py", NOTIFY_LINE, """        self.notifier.send(courier_id, f"Pickup {order.id}: {order.address.house}, {order.address.postcode}")
        try:
            self.notifier.send(order.guest_id, "Your order is on its way")
        except Exception:
            # Optional: the app already shows OUT_FOR_DELIVERY. Never blocks dispatch.
            log.warning("guest sms failed for %s", order.id, exc_info=True)
        return order
""")],
    },
    {
        "id": "c10-open-till-23",
        "kind": "clean",
        "title": "Kitchen open until 23:00",
        "body": "Ops request: last orders move from 22:00 to 23:00 London time from next week.",
        "note": "A business change requested in the PR; the constant is the intended place for it.",
        "edits": [
            ("orders/service.py", "LAST_ORDER_HOUR = 22\n", "LAST_ORDER_HOUR = 23\n"),
            ("tests/test_service.py", "datetime(2026, 7, 1, 22, 30, tzinfo=LONDON)", "datetime(2026, 7, 1, 23, 30, tzinfo=LONDON)"),
        ],
    },
]
