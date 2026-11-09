from dataclasses import dataclass


@dataclass(frozen=True)
class Zone:
    name: str
    fee_pence: int
    surge_pence: int = 0  # added to the fee while the surge_fee flag is on
    free_over_pence: int | None = None  # free delivery once the subtotal reaches this; None = no offer in this zone


# Loaded from the config service in production. Fields a zone leaves out take the defaults above.
ZONES = {
    "CB1": {"name": "CB1", "fee_pence": 299, "surge_pence": 100, "free_over_pence": 2500},
    "CB4": {"name": "CB4", "fee_pence": 349, "surge_pence": 150},
}


def load_zones(raw=ZONES) -> dict[str, Zone]:
    return {name: Zone(**fields) for name, fields in raw.items()}
