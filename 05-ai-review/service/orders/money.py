"""Money is integer pence everywhere. Never floats."""


def subtotal(items) -> int:
    return sum(i.unit_price_pence * i.qty for i in items)


def percent_off(amount_pence: int, percent: int) -> int:
    """Discount in pence, rounded down so the guest is never charged a fraction."""
    if not 0 <= percent <= 100:
        raise ValueError(f"percent out of range: {percent}")
    return amount_pence * percent // 100
