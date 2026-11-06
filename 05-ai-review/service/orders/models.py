from dataclasses import dataclass, field
from datetime import datetime

CREATED = "CREATED"
PAID = "PAID"
PAYMENT_FAILED = "PAYMENT_FAILED"
PREPARING = "PREPARING"
OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
DELIVERED = "DELIVERED"
CANCELLED = "CANCELLED"

TRANSITIONS = {
    CREATED: {PAID, PAYMENT_FAILED, CANCELLED},
    PAID: {PREPARING, CANCELLED},
    PREPARING: {OUT_FOR_DELIVERY, CANCELLED},
    OUT_FOR_DELIVERY: {DELIVERED},
    DELIVERED: set(),
    PAYMENT_FAILED: set(),
    CANCELLED: set(),
}


@dataclass(frozen=True)
class Address:
    house: str
    street: str
    city: str
    postcode: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Item:
    sku: str
    name: str
    qty: int
    unit_price_pence: int


@dataclass
class Order:
    id: str
    guest_id: str
    items: list[Item]
    address: Address
    zone: str
    created_at: datetime  # timezone-aware, UTC
    subtotal_pence: int = 0
    delivery_fee_pence: int = 0
    discount_pence: int = 0
    total_pence: int = 0
    status: str = CREATED
    courier_id: str | None = None
    picked_up_at: datetime | None = None
    history: list[str] = field(default_factory=list)


@dataclass
class Courier:
    id: str
    max_orders: int = 3  # orders chained onto one trip
    order_ids: list[str] = field(default_factory=list)
