"""Scale per-request savings from encoding_test.py to a day, a month, a year and a cloud bill.

Prices: AWS on-demand, US/EU regions, checked 2026-10-06.
Cross-AZ is $0.01/GB charged on each side; calls inside one AZ are free.
Internet egress is tiered per month; only used for the 100-byte intro example.
"""
# (JSON bytes, Protobuf bytes, JSON encode+decode µs, Protobuf encode+decode µs), from encoding_test.py
ORDERS = {
    "typical (3 items)": (994, 438, 4.7 + 3.8, 0.4 + 0.5),
    "big (20 items)": (3046, 1290, 12.5 + 10.3, 0.9 + 1.3),
}
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


def gb_month(saved, rps):
    return saved * rps * SECONDS_PER_DAY * DAYS_PER_MONTH / 1e9


gb = gb_month(100, 1_000)
print(f"Intro: 100 bytes at 1,000 RPS = {gb / DAYS_PER_MONTH:.1f} GB/day, {gb:.0f} GB/month, "
      f"${egress_cost(gb):.0f}/month internet egress\n")

print(f"{'order':<19}{'RPS':>8}{'saved/req':>11}{'GB/day':>9}{'TB/month':>10}{'cross-AZ $/mo':>15}{'$/yr':>9}{'CPU cores':>11}")
for name, (json_b, proto_b, json_us, proto_us) in ORDERS.items():
    for rps in (100, 1_000, 10_000):
        saved = json_b - proto_b
        gb = gb_month(saved, rps)
        az = gb * CROSS_AZ_PER_GB
        print(f"{name:<19}{rps:>8,}{saved:>11,}{gb / DAYS_PER_MONTH:>9,.1f}{gb / 1000:>10,.2f}"
              f"{az:>15,.0f}{az * 12:>9,.0f}{rps * (json_us - proto_us) / 1e6:>11.3f}")
