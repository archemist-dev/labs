"""Scale the per-order numbers from extract_test.py to a day and a year.

Usage: python3 scale.py
Row counts come from running one order through the monolith; the rest are stated assumptions.
"""
from extract_test import POSITION_EVERY_S, TO_GUEST_MIN, TO_RESTAURANT_MIN, run
from monolith import db

ORDERS_PER_DAY = (1_000, 10_000)
PEAK_HOUR_SHARE = 0.15  # the dinner peak hour carries 15% of the day's orders
ROW_BYTES = 100         # a Postgres position row plus one index entry, roughly


def rows(table):
    return db.one(f"SELECT COUNT(*) FROM {table}")[0]


def main():
    run()
    positions = rows("courier_positions")
    order_rows = rows("orders") + rows("order_items") + rows("order_status_history")
    with_courier_min = TO_RESTAURANT_MIN + TO_GUEST_MIN

    print(f"Rows per order: location logs (courier_positions) {positions}, orders tables {order_rows} "
          f"(orders + order_items + order_status_history)\n")
    print("| Orders/day | Location logs/day | Writes/s avg | Writes/s peak | Location logs/yr | GB/yr | Order rows/yr |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    for per_day in ORDERS_PER_DAY:
        per_year = positions * per_day * 365
        concurrent = per_day * PEAK_HOUR_SHARE * with_courier_min / 60
        print(f"| {per_day:,} | {positions * per_day:,} | {positions * per_day / 86_400:.1f} "
              f"| {concurrent / POSITION_EVERY_S:.0f} | {per_year / 1e6:,.0f}M | {per_year * ROW_BYTES / 1e9:,.1f} "
              f"| {order_rows * per_day * 365 / 1e6:,.1f}M |")
    print(f"\nAssumptions: peak hour = {PEAK_HOUR_SHARE:.0%} of the day's orders, a courier holds an order "
          f"{with_courier_min} min, one GPS point every {POSITION_EVERY_S} s, ~{ROW_BYTES} bytes per location log row "
          f"with its index, location logs kept for a year.")


if __name__ == "__main__":
    main()
