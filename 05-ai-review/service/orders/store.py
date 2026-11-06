import copy
import threading

from .models import Courier, Order


class ConflictError(Exception):
    pass


class OrderStore:
    """The primary store (in memory here, a database in production).

    get and get_courier return copies, like rows read from a database: changing one changes nothing until it is
    written back. update_status and attach_order are the safe ways to change state concurrently.
    Every change to a courier's chain is also published as an event for read models (see views.py).
    """

    def __init__(self):
        self._orders: dict[str, Order] = {}
        self._couriers: dict[str, Courier] = {}
        self._events: list[tuple[str, list[str]]] = []
        self._lock = threading.Lock()

    def save(self, order: Order) -> None:
        with self._lock:
            self._orders[order.id] = copy.deepcopy(order)

    def get(self, order_id: str) -> Order:
        with self._lock:
            return copy.deepcopy(self._orders[order_id])

    def update_status(self, order_id: str, expected: str, new: str) -> Order:
        """Compare-and-set: fails if someone else moved the order first."""
        with self._lock:
            order = self._orders[order_id]
            if order.status != expected:
                raise ConflictError(f"{order_id}: expected {expected}, found {order.status}")
            order.status = new
            order.history.append(new)
            return copy.deepcopy(order)

    def save_courier(self, courier: Courier) -> None:
        with self._lock:
            self._couriers[courier.id] = copy.deepcopy(courier)
            self._events.append((courier.id, list(courier.order_ids)))

    def get_courier(self, courier_id: str) -> Courier:
        with self._lock:
            return copy.deepcopy(self._couriers[courier_id])

    def couriers(self) -> list[Courier]:
        with self._lock:
            return [copy.deepcopy(c) for c in self._couriers.values()]

    def attach_order(self, order_id: str, courier_id: str) -> Order:
        """Chain an order onto a courier's trip, atomically."""
        with self._lock:
            order = self._orders[order_id]
            courier = self._couriers[courier_id]
            if order.courier_id is not None:
                raise ConflictError(f"{order_id} already has courier {order.courier_id}")
            if len(courier.order_ids) >= courier.max_orders:
                raise ConflictError(f"courier {courier_id} is full")
            order.courier_id = courier_id
            courier.order_ids.append(order_id)
            self._events.append((courier_id, list(courier.order_ids)))
            return copy.deepcopy(order)

    def detach_order(self, order_id: str) -> None:
        """Take an order off its courier's chain (reassignment, courier ends shift)."""
        with self._lock:
            order = self._orders[order_id]
            courier = self._couriers[order.courier_id]
            courier.order_ids.remove(order_id)
            order.courier_id = None
            self._events.append((courier.id, list(courier.order_ids)))

    def events_since(self, position: int) -> list[tuple[str, list[str]]]:
        with self._lock:
            return list(self._events[position:])
