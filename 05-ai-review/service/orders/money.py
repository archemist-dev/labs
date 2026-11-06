"""Money is integer pence everywhere. Never floats.

Promo terms: a percentage promo applies to the item subtotal only, never to delivery or surge fees.
"""


def subtotal(items) -> int:
    return sum(i.unit_price_pence * i.qty for i in items)


def percent_off(amount_pence: int, percent: int) -> int:
    """Discount in pence, rounded down so the guest is never charged a fraction."""
    if not 0 <= percent <= 100:
        raise ValueError(f"percent out of range: {percent}")
    return amount_pence * percent // 100


def delivery_fee(zone, subtotal_pence: int, surge: bool) -> int:
    if zone.free_over_pence is not None and subtotal_pence >= zone.free_over_pence:
        return 0
    return zone.fee_pence + (zone.surge_pence if surge else 0)
