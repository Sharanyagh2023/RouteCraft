import math


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def should_ignore_noise(last: dict | None, current: dict, threshold_meters: float = 7.0) -> bool:
    if not last:
        return False
    distance = haversine_meters(last["lat"], last["lng"], current["lat"], current["lng"])
    return distance < threshold_meters
