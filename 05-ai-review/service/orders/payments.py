"""Card provider client.

The provider dedupes charges by Idempotency-Key: a repeated key returns the first charge, never a second one.
Refunds take no key: every POST /refunds creates a new refund.
"""
from dataclasses import dataclass

from .http import TransientError


class PaymentError(Exception):
    """The provider declined the charge. The guest was not charged."""


class PaymentTimeout(Exception):
    """No answer from the provider. The charge may or may not have happened."""


@dataclass(frozen=True)
class RefundResult:
    ok: bool
    reason: str = ""


class PaymentClient:
    def __init__(self, http):
        self.http = http

    def charge(self, order_id: str, amount_pence: int, idempotency_key: str) -> str:
        try:
            resp = self.http.post(
                "/charges",
                json={"order_id": order_id, "amount": amount_pence, "currency": "GBP"},
                headers={"Idempotency-Key": idempotency_key},
            )
        except TransientError as e:
            raise PaymentTimeout(order_id) from e
        if resp.status == 402:
            raise PaymentError(resp.json().get("reason", "declined"))
        return resp.json()["charge_id"]

    def refund(self, order_id: str, amount_pence: int) -> RefundResult:
        try:
            resp = self.http.post("/refunds", json={"order_id": order_id, "amount": amount_pence})
        except TransientError:
            return RefundResult(ok=False, reason="no answer; check the provider before refunding again")
        if resp.status != 200:
            return RefundResult(ok=False, reason=resp.json().get("reason", "refund failed"))
        return RefundResult(ok=True)
