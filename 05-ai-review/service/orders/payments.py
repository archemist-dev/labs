from dataclasses import dataclass


class PaymentError(Exception):
    """The provider declined the charge. The guest was not charged."""


class PaymentTimeout(Exception):
    """No answer from the provider. The charge may or may not have happened."""


@dataclass(frozen=True)
class RefundResult:
    ok: bool
    reason: str = ""


class PaymentClient:
    """Thin client for the card provider. The provider dedupes charges by idempotency key."""

    def __init__(self, http):
        self.http = http

    def charge(self, order_id: str, amount_pence: int, idempotency_key: str) -> str:
        resp = self.http.post(
            "/charges",
            json={"order_id": order_id, "amount": amount_pence, "currency": "GBP"},
            headers={"Idempotency-Key": idempotency_key},
            timeout=5,
        )
        if resp.status == 402:
            raise PaymentError(resp.json().get("reason", "declined"))
        if resp.status in (408, 504):
            raise PaymentTimeout(order_id)
        return resp.json()["charge_id"]

    def refund(self, order_id: str, amount_pence: int) -> RefundResult:
        resp = self.http.post("/refunds", json={"order_id": order_id, "amount": amount_pence}, timeout=5)
        if resp.status != 200:
            return RefundResult(ok=False, reason=resp.json().get("reason", "refund failed"))
        return RefundResult(ok=True)
