"""Chaining: hand a new order to a courier already on a trip nearby, so one trip carries several orders."""
from . import geo

MAX_DETOUR = 800  # metres from the courier's last chained order to the new one


def pick_courier(store, order):
    """The courier whose last chained order is closest to the new one, within MAX_DETOUR and with room left."""
    best = None
    for courier in store.couriers():
        if not courier.order_ids or len(courier.order_ids) >= courier.max_orders:
            continue
        last = store.get(courier.order_ids[-1])
        detour = geo.distance_m(last.address, order.address)
        if detour <= MAX_DETOUR and (best is None or detour < best[0]):
            best = (detour, courier.id)
    return best[1] if best else None
