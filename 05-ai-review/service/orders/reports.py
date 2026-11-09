from collections import defaultdict
from zoneinfo import ZoneInfo

from .models import DELIVERED

LONDON = ZoneInfo("Europe/London")


def london_day(ts):
    """The business day of a UTC timestamp. Kitchens open, close and report in London time."""
    return ts.astimezone(LONDON).date()


def daily_revenue(orders) -> dict:
    totals = defaultdict(int)
    for o in orders:
        if o.status == DELIVERED:
            totals[london_day(o.created_at)] += o.total_pence
    return dict(totals)
