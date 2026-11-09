from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def distance(a, b) -> float:
    """Great-circle distance between two addresses, in kilometres. Used for ETAs and reports."""
    dlat, dlon = radians(b.lat - a.lat), radians(b.lon - a.lon)
    h = sin(dlat / 2) ** 2 + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(h))


def distance_m(a, b) -> float:
    """Same as distance, in metres. Chaining rules are set in metres."""
    return distance(a, b) * 1000
