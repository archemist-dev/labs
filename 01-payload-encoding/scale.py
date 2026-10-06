"""Scale per-request savings from encoding_test.py to a day, a month and a cloud bill.

Prices: AWS on-demand, US/EU regions, checked 2026-10-06.
Internet egress is tiered per month; cross-AZ is $0.01/GB charged on each side.
"""
JSON_BYTES, PROTO_BYTES = 3046, 1289                  # from encoding_test.py
JSON_CPU_US, PROTO_CPU_US = 12.9 + 9.9, 0.8 + 1.2     # encode + decode per hop
EGRESS_TIERS_GB = [(10_240, 0.09), (40_960, 0.085), (102_400, 0.07), (float("inf"), 0.05)]
CROSS_AZ_PER_GB = 0.01 * 2
SECONDS_PER_DAY, DAYS_PER_MONTH = 86_400, 30


def egress_cost(gb):
    cost = 0.0
    for size, price in EGRESS_TIERS_GB:
        step = min(gb, size)
        cost += step * price
        gb -= step
        if gb <= 0:
            break
    return cost


print(f"{'RPS':>8}{'saved/req':>11}{'GB/day':>10}{'TB/month':>10}{'egress $/mo':>13}{'cross-AZ $/mo':>15}{'CPU cores':>11}")
for rps in (1_000, 10_000, 100_000):
    for saved in (100, JSON_BYTES - PROTO_BYTES):
        gb_day = saved * rps * SECONDS_PER_DAY / 1e9
        gb_month = gb_day * DAYS_PER_MONTH
        cores = f"{rps * (JSON_CPU_US - PROTO_CPU_US) / 1e6:.2f}" if saved != 100 else "-"
        print(f"{rps:>8,}{saved:>11,}{gb_day:>10,.1f}{gb_month / 1000:>10,.2f}"
              f"{egress_cost(gb_month):>13,.0f}{gb_month * CROSS_AZ_PER_GB:>15,.0f}{cores:>11}")
