import threading

from .models import Order


class ConflictError(Exception):
    pass


class OrderStore:
    """In-memory store. update_status is the only safe way to change status concurrently."""

    def __init__(self):
        self._orders: dict[str, Order] = {}
        self._lock = threading.Lock()

    def save(self, order: Order) -> None:
        with self._lock:
            self._orders[order.id] = order

    def get(self, order_id: str) -> Order:
        with self._lock:
            return self._orders[order_id]

    def update_status(self, order_id: str, expected: str, new: str) -> Order:
        """Compare-and-set: fails if someone else moved the order first."""
        with self._lock:
            order = self._orders[order_id]
            if order.status != expected:
                raise ConflictError(f"{order_id}: expected {expected}, found {order.status}")
            order.status = new
            order.history.append(new)
            return order

    def ping(self) -> None:
        with self._lock:
            len(self._orders)
