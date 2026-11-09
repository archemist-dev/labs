"""Feature flags. An unknown name reads as off, so a missing flag switches a feature off instead of crashing."""

FLAGS = {
    "surge_fee": True,
    "chain_orders": True,
}


def enabled(name: str) -> bool:
    return FLAGS.get(name, False)
