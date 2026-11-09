from .config import load_zones
from .jobs import start_view_refresher
from .notify import Outbox
from .service import OrderService
from .store import OrderStore


def build(payments, notifier, stock, promos) -> OrderService:
    """Wire the service for production: one store, the courier view refreshed in the background."""
    svc = OrderService(OrderStore(), payments, notifier, Outbox(), load_zones(), promos, stock)
    start_view_refresher(svc.view)
    return svc
