"""The 20 pull requests reviewed in this lab, as edits to service/.

Every seeded bug follows one rule: the diff looks correct on its own, and it breaks only because of a rule or
contract written somewhere else in the codebase (a docstring, a config default, a caller). The reviewer can open
those files; nothing it needs is hidden.

kind "bug": one seeded silent failure; `bug` says what breaks and where the rule lives (the judge sees it, the
reviewer never does). kind "clean": the same area done right; `note` says why it is fine.
`twin` pairs each bug with its clean version. check_bugs.py runs every pair and shows the difference.
Each edit is (path, old, new): `old` must occur exactly once in the base file; old=None creates the file.
"""

CHAIN_CALL = """        courier_id = chain.pick_courier(self.store, order)
"""

DELIVER = """    def deliver(self, order_id) -> Order:
        return self.advance(order_id, DELIVERED)
"""

HTTP_POST = """    def post(self, path, json, headers=None, timeout=5):
        resp = self.session.post(self.base_url + path, json=json, headers=headers or {}, timeout=timeout)
        if resp.status in (408, 500, 502, 503, 504):
            raise TransientError(f"POST {path}: {resp.status}")
        return resp
"""

CARD_EXPIRED_RAISE = ("orders/payments.py", """        if resp.status == 402:
            raise PaymentError(resp.json().get("reason", "declined"))
""", """        if resp.status == 402:
            reason = resp.json().get("reason", "declined")
            if reason == "card_expired":
                raise CardExpired(order_id)
            raise PaymentError(reason)
""")

PRS = [
    # ---------- seeded silent failures ----------
    {
        "id": "b01-chain-from-view",
        "twin": "c01-chain-view-shortlist",
        "kind": "bug",
        "title": "Read courier chains from the courier view in pick_courier",
        "body": "pick_courier reads every courier from the primary on each new order, which is most of the primary's "
                "read load at dinner peak. The courier view already holds every chain in memory, so read chains "
                "from there. Order rows still come from the store.",
        "bug": "Stale read model used for a decision: views.py says CourierView lags the store by seconds and is for "
               "display only, decisions read the store. When an order was just moved off a courier (detach_order), "
               "the view still lists it in their chain, so a new order near that address is chained onto a courier "
               "who no longer goes there. attach_order only checks capacity, so it succeeds. No error anywhere.",
        "edits": [
            ("orders/chain.py", """def pick_courier(store, order):
    \"\"\"The courier whose last chained order is closest to the new one, within MAX_DETOUR and with room left.\"\"\"
    best = None
    for courier in store.couriers():
        if not courier.order_ids or len(courier.order_ids) >= courier.max_orders:
            continue
        last = store.get(courier.order_ids[-1])
""", """def pick_courier(store, view, order):
    \"\"\"The courier whose last chained order is closest to the new one, within MAX_DETOUR and with room left.\"\"\"
    best = None
    for courier in store.couriers():
        chained = view.chain(courier.id)
        if not chained or len(chained) >= courier.max_orders:
            continue
        last = store.get(chained[-1])
"""),
            ("orders/service.py", CHAIN_CALL, """        courier_id = chain.pick_courier(self.store, self.view, order)
"""),
        ],
    },
    {
        "id": "b02-http-retry",
        "twin": "c02-retry-charges-only",
        "kind": "bug",
        "title": "Retry transient provider errors in Http.post",
        "body": "Provider calls fail a few times an hour with 502/503 or a timeout and the next attempt works. Retry "
                "twice with a short backoff in Http.post so every provider client gets it.",
        "bug": "Retry of a non-idempotent call: payments.py says refunds take no idempotency key and every POST "
               "/refunds creates a new refund. Retrying every POST in Http.post means a refund that timed out after "
               "the provider applied it is refunded again. Charges are safe (deduped by key); refunds are not. "
               "Money is lost silently.",
        "edits": [
            ("orders/http.py", "class TransientError(Exception):", "import time\n\n\nclass TransientError(Exception):"),
            ("orders/http.py", HTTP_POST, """    def post(self, path, json, headers=None, timeout=5, attempts=3):
        for attempt in range(attempts):
            resp = self.session.post(self.base_url + path, json=json, headers=headers or {}, timeout=timeout)
            if resp.status not in (408, 500, 502, 503, 504):
                return resp
            if attempt < attempts - 1:
                time.sleep(0.2 * 2 ** attempt)
        raise TransientError(f"POST {path}: {resp.status} after {attempts} attempts")
"""),
        ],
    },
    {
        "id": "b03-promo-on-total",
        "twin": "c03-promo-validate",
        "kind": "bug",
        "title": "Apply the promo to what the guest pays",
        "body": "Guests read \"10% off your order\" and support gets tickets when the discount doesn't match 10% of "
                "the total they see. Apply the percentage to subtotal plus delivery so the numbers line up.",
        "bug": "Breaks a business rule written elsewhere: money.py states promos apply to the item subtotal only, "
               "never to delivery or surge fees. Every promo order with a delivery fee is over-discounted by the "
               "promo percentage of that fee. Nothing errors; margins drift.",
        "edits": [("orders/service.py", """            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
""", """            payable = order.subtotal_pence + order.delivery_fee_pence
            order.discount_pence = money.percent_off(payable, self.promos[promo_code]["percent"])
""")],
    },
    {
        "id": "b04-summary-utc-day",
        "twin": "c04-summary-london-day",
        "kind": "bug",
        "title": "Kitchen summary: orders and revenue for one day",
        "body": "Kitchen managers want a daily summary: delivered orders and revenue for a given day.",
        "bug": "Wrong day boundary: created_at is UTC (models.py) and business days are London days (reports.py "
               "has london_day for this). created_at.date() is the UTC date, so in British Summer Time orders "
               "between 00:00 and 01:00 London time land in the previous day's summary. Totals look plausible.",
        "edits": [("orders/reports.py", """def daily_revenue(orders) -> dict:""", """def kitchen_summary(orders, day) -> dict:
    delivered = [o for o in orders if o.status == DELIVERED and o.created_at.date() == day]
    return {"day": day.isoformat(), "orders": len(delivered), "revenue_pence": sum(o.total_pence for o in delivered)}


def daily_revenue(orders) -> dict:""")],
    },
    {
        "id": "b05-notify-returns-status",
        "twin": "c05-notify-timeout-error",
        "kind": "bug",
        "title": "Notifier.send returns a status instead of raising",
        "body": "SMS failures are expected (bad numbers, provider hiccups), so they are not exceptional. Return "
                "True/False and log the failure instead of raising.",
        "bug": "Changed contract, caller not updated: service.dispatch relies on send raising NotifyError to put "
               "the message in the Outbox for retry. Now send returns False, dispatch ignores the return value, "
               "nothing is queued, and the courier is never told about the pickup. Only a log line.",
        "edits": [
            ("orders/notify.py", "class NotifyError(Exception):",
             "import logging\n\nlog = logging.getLogger(__name__)\n\n\nclass NotifyError(Exception):"),
            ("orders/notify.py", """    \"\"\"SMS to couriers and guests. send raises NotifyError when the provider rejects the message or times out.\"\"\"
""", """    \"\"\"SMS to couriers and guests. send returns False when the provider rejects the message or times out.\"\"\"
"""),
            ("orders/notify.py", """    def send(self, to: str, text: str) -> None:
        resp = self.sms.send(to, text)
        if not resp.ok:
            raise NotifyError(f"{to}: {resp.error}")
""", """    def send(self, to: str, text: str) -> bool:
        resp = self.sms.send(to, text)
        if not resp.ok:
            log.warning("sms to %s failed: %s", to, resp.error)
        return resp.ok
"""),
        ],
    },
    {
        "id": "b06-card-expired",
        "twin": "c06-card-expired-subclass",
        "kind": "bug",
        "title": "Tell the app when the card has expired",
        "body": "The app wants to ask for a new card when the card has expired, instead of a generic decline. Raise "
                "a specific CardExpired for that provider reason.",
        "bug": "New exception outside the hierarchy the caller catches: service.place_order releases reserved stock "
               "and marks the order PAYMENT_FAILED only on PaymentError. CardExpired is not a PaymentError, so on "
               "an expired card the stock stays reserved forever and the order is stuck in CREATED. The guest sees "
               "an error; the leaked stock and the stuck order are silent.",
        "edits": [
            ("orders/payments.py", """class PaymentTimeout(Exception):""", """class CardExpired(Exception):
    \"\"\"The card has expired. The app should ask for another card.\"\"\"


class PaymentTimeout(Exception):"""),
            CARD_EXPIRED_RAISE,
        ],
    },
    {
        "id": "b07-zone-defaults",
        "twin": "c07-zone-min-order",
        "kind": "bug",
        "title": "Zone config: plain int fields",
        "body": "The new config service sends every numeric field as an int and mypy complains about the Optional. "
                "Make free_over_pence a plain int with 0 as the default, like surge_pence.",
        "bug": "Default changes meaning: money.delivery_fee treats free_over_pence None as \"no offer\" and any number "
               "as a threshold. With 0 as the default, every zone that leaves the field out (CB4 in config.ZONES) "
               "gives free delivery on every order. No error; delivery fees just stop.",
        "edits": [("orders/config.py", """    free_over_pence: int | None = None  # free delivery once the subtotal reaches this; None = no offer in this zone
""", """    free_over_pence: int = 0  # free delivery once the subtotal reaches this
""")],
    },
    {
        "id": "b08-flag-rename",
        "twin": "c08-flag-rename-both",
        "kind": "bug",
        "title": "Rename the surge_fee flag to dynamic_delivery_fee",
        "body": "Pricing calls it dynamic delivery fee everywhere; rename the flag check to match their docs.",
        "bug": "Rename on one side only: flags.FLAGS still defines surge_fee, and flags.enabled reads an unknown "
               "name as off. Surge pricing silently stops for every order.",
        "edits": [("orders/service.py", """surge=flags.enabled("surge_fee"))""", """surge=flags.enabled("dynamic_delivery_fee"))""")],
    },
    {
        "id": "b09-pickup-time-lost",
        "twin": "c09-pickup-time-saved",
        "kind": "bug",
        "title": "Record when the courier picks the order up",
        "body": "Adds OrderService.pick_up so the courier app can record pickup time for ETA tracking.",
        "bug": "Write to a copy: store.get returns a copy (store.py docstring: changing it changes nothing until it "
               "is written back). pick_up sets picked_up_at on the copy and returns it, so the caller sees the time "
               "but it is never stored. ETAs and reports have no pickup times; no error.",
        "edits": [("orders/service.py", DELIVER, DELIVER + """
    def pick_up(self, order_id, now=None) -> Order:
        order = self.store.get(order_id)
        order.picked_up_at = now or datetime.now(timezone.utc)
        log.info("order %s picked up by %s", order.id, order.courier_id)
        return order
""")],
    },
    {
        "id": "b10-spread-units",
        "twin": "c10-spread-metres",
        "kind": "bug",
        "title": "Don't let a chain spread too far from its first order",
        "body": "Chains creep: each new order is near the last one, but the trip drifts across town. Also check the "
                "distance from the chain's first order.",
        "bug": "Unit mismatch: geo.distance returns kilometres and MAX_DETOUR is in metres (chain.py comment; "
               "geo.distance_m exists for this). A kilometre count is never above 800, so the new check never "
               "rejects anything and chains keep drifting. Tests pass; nothing errors.",
        "edits": [("orders/chain.py", """        last = store.get(courier.order_ids[-1])
""", """        last = store.get(courier.order_ids[-1])
        first = store.get(courier.order_ids[0])
        if geo.distance(first.address, order.address) > MAX_DETOUR:
            continue
""")],
    },
    # ---------- clean twins ----------
    {
        "id": "c01-chain-view-shortlist",
        "twin": "b01-chain-from-view",
        "kind": "clean",
        "title": "Shortlist couriers from the courier view in pick_courier",
        "body": "pick_courier reads every courier from the primary on each new order. Use the courier view to "
                "shortlist couriers that are on a trip, then read each shortlisted courier from the store and decide "
                "on that, since the view can lag.",
        "note": "The view only narrows the list; the decision (chain, capacity, last order) is made on the store's "
                "current data. A lagging view can at worst miss a courier who just started a trip, never assign a "
                "wrong one.",
        "edits": [
            ("orders/chain.py", """def pick_courier(store, order):
    \"\"\"The courier whose last chained order is closest to the new one, within MAX_DETOUR and with room left.\"\"\"
    best = None
    for courier in store.couriers():
""", """def pick_courier(store, view, order):
    \"\"\"The courier whose last chained order is closest to the new one, within MAX_DETOUR and with room left.\"\"\"
    best = None
    shortlist = [courier_id for courier_id in view.courier_ids() if view.chain(courier_id)]
    for courier in (store.get_courier(courier_id) for courier_id in shortlist):
"""),
            ("orders/service.py", CHAIN_CALL, """        courier_id = chain.pick_courier(self.store, self.view, order)
"""),
        ],
    },
    {
        "id": "c02-retry-charges-only",
        "twin": "b02-http-retry",
        "kind": "clean",
        "title": "Retry transient errors on charges",
        "body": "Provider calls fail a few times an hour with 502/503 or a timeout. Charges are deduped by "
                "Idempotency-Key, so retry those twice with a short backoff. Refunds stay single-attempt.",
        "note": "Retry is opt-in per call and only charges opt in; charges carry the same Idempotency-Key on every "
                "attempt, so a repeat returns the first charge.",
        "edits": [
            ("orders/http.py", "class TransientError(Exception):", "import time\n\n\nclass TransientError(Exception):"),
            ("orders/http.py", HTTP_POST, """    def post(self, path, json, headers=None, timeout=5, attempts=1):
        \"\"\"attempts > 1 only for calls the provider dedupes (same Idempotency-Key).\"\"\"
        for attempt in range(attempts):
            resp = self.session.post(self.base_url + path, json=json, headers=headers or {}, timeout=timeout)
            if resp.status not in (408, 500, 502, 503, 504):
                return resp
            if attempt < attempts - 1:
                time.sleep(0.2 * 2 ** attempt)
        raise TransientError(f"POST {path}: {resp.status} after {attempts} attempts")
"""),
            ("orders/payments.py", """                headers={"Idempotency-Key": idempotency_key},
            )""", """                headers={"Idempotency-Key": idempotency_key},
                attempts=3,
            )"""),
        ],
    },
    {
        "id": "c03-promo-validate",
        "twin": "b03-promo-on-total",
        "kind": "clean",
        "title": "Reject unknown promo codes cleanly",
        "body": "Unknown promo codes raised a bare KeyError (500). Validate the code first; the discount stays on the "
                "item subtotal, per the promo terms in money.py.",
        "note": "Discount stays on the subtotal only; unknown codes now raise ValueError instead of KeyError.",
        "edits": [("orders/service.py", """            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
""", """            if promo_code not in self.promos:
                raise ValueError(f"unknown promo: {promo_code}")
            order.discount_pence = money.percent_off(order.subtotal_pence, self.promos[promo_code]["percent"])
""")],
    },
    {
        "id": "c04-summary-london-day",
        "twin": "b04-summary-utc-day",
        "kind": "clean",
        "title": "Kitchen summary: orders and revenue for one day",
        "body": "Kitchen managers want a daily summary: delivered orders and revenue for a given day.",
        "note": "Uses london_day, the business-day rule in the same module.",
        "edits": [("orders/reports.py", """def daily_revenue(orders) -> dict:""", """def kitchen_summary(orders, day) -> dict:
    delivered = [o for o in orders if o.status == DELIVERED and london_day(o.created_at) == day]
    return {"day": day.isoformat(), "orders": len(delivered), "revenue_pence": sum(o.total_pence for o in delivered)}


def daily_revenue(orders) -> dict:""")],
    },
    {
        "id": "c05-notify-timeout-error",
        "twin": "b05-notify-returns-status",
        "kind": "clean",
        "title": "Separate SMS timeouts from rejections",
        "body": "Ops wants to tell provider timeouts from rejected numbers in the logs. Raise NotifyTimeout, a "
                "NotifyError subclass, for timeouts.",
        "note": "Still raises a NotifyError (subclass), so dispatch's except still queues the message.",
        "edits": [
            ("orders/notify.py", """class Notifier:""", """class NotifyTimeout(NotifyError):
    \"\"\"The provider did not answer in time.\"\"\"


class Notifier:"""),
            ("orders/notify.py", """        if not resp.ok:
            raise NotifyError(f"{to}: {resp.error}")
""", """        if not resp.ok:
            if resp.error == "timeout":
                raise NotifyTimeout(to)
            raise NotifyError(f"{to}: {resp.error}")
"""),
        ],
    },
    {
        "id": "c06-card-expired-subclass",
        "twin": "b06-card-expired",
        "kind": "clean",
        "title": "Tell the app when the card has expired",
        "body": "The app wants to ask for a new card when the card has expired. Raise CardExpired, a PaymentError "
                "subclass, so existing decline handling still runs.",
        "note": "CardExpired subclasses PaymentError, so place_order still releases stock and marks PAYMENT_FAILED.",
        "edits": [
            ("orders/payments.py", """class PaymentTimeout(Exception):""", """class CardExpired(PaymentError):
    \"\"\"The card has expired. The app should ask for another card.\"\"\"


class PaymentTimeout(Exception):"""),
            CARD_EXPIRED_RAISE,
        ],
    },
    {
        "id": "c07-zone-min-order",
        "twin": "b07-zone-defaults",
        "kind": "clean",
        "title": "Minimum order per zone",
        "body": "Some zones need a minimum basket. Adds min_order_pence (0 = no minimum) and rejects smaller "
                "orders.",
        "note": "0 means no minimum: the check (subtotal < 0) never rejects, so zones without the field behave as "
                "before.",
        "edits": [
            ("orders/config.py", """    free_over_pence: int | None = None  # free delivery once the subtotal reaches this; None = no offer in this zone
""", """    free_over_pence: int | None = None  # free delivery once the subtotal reaches this; None = no offer in this zone
    min_order_pence: int = 0  # 0 = no minimum
"""),
            ("orders/service.py", """        order.delivery_fee_pence = money.delivery_fee(""", """        if order.subtotal_pence < zone.min_order_pence:
            raise ValueError(f"minimum order in {zone_name} is {zone.min_order_pence} pence")
        order.delivery_fee_pence = money.delivery_fee("""),
        ],
    },
    {
        "id": "c08-flag-rename-both",
        "twin": "b08-flag-rename",
        "kind": "clean",
        "title": "Rename the surge_fee flag to dynamic_delivery_fee",
        "body": "Pricing calls it dynamic delivery fee everywhere; rename the flag and its check to match.",
        "note": "Renamed in flags.FLAGS and at the call site together.",
        "edits": [
            ("orders/service.py", """surge=flags.enabled("surge_fee"))""", """surge=flags.enabled("dynamic_delivery_fee"))"""),
            ("orders/flags.py", """    "surge_fee": True,""", """    "dynamic_delivery_fee": True,"""),
        ],
    },
    {
        "id": "c09-pickup-time-saved",
        "twin": "b09-pickup-time-lost",
        "kind": "clean",
        "title": "Record when the courier picks the order up",
        "body": "Adds OrderService.pick_up so the courier app can record pickup time for ETA tracking.",
        "note": "Reads, changes and writes the order back with store.save.",
        "edits": [("orders/service.py", DELIVER, DELIVER + """
    def pick_up(self, order_id, now=None) -> Order:
        order = self.store.get(order_id)
        order.picked_up_at = now or datetime.now(timezone.utc)
        self.store.save(order)
        log.info("order %s picked up by %s", order.id, order.courier_id)
        return order
""")],
    },
    {
        "id": "c10-spread-metres",
        "twin": "b10-spread-units",
        "kind": "clean",
        "title": "Don't let a chain spread too far from its first order",
        "body": "Chains creep: each new order is near the last one, but the trip drifts across town. Also check the "
                "distance from the chain's first order.",
        "note": "Uses geo.distance_m, metres, like MAX_DETOUR.",
        "edits": [("orders/chain.py", """        last = store.get(courier.order_ids[-1])
""", """        last = store.get(courier.order_ids[-1])
        first = store.get(courier.order_ids[0])
        if geo.distance_m(first.address, order.address) > MAX_DETOUR:
            continue
""")],
    },
]
