from dataclasses import dataclass
from datetime import datetime


@dataclass
class FareContext:
    is_peak: bool
    is_raining: bool


BASE_FARES = {
    "auto": (30, 10),
    "car": (50, 15),
    "bike": (20, 8),
    "metro": (10, 5),
    "bus": (5, 4),
    "walk": (0, 0),
}


def is_peak_hour(now: datetime | None = None) -> bool:
    now = now or datetime.now()
    minute = now.hour * 60 + now.minute
    return 8 * 60 <= minute <= 10 * 60 or 17 * 60 <= minute <= 20 * 60


def step_fare(mode: str, distance_km: float, context: FareContext) -> tuple[float, float]:
    fixed, per_km = BASE_FARES.get(mode, BASE_FARES["walk"])
    cost = fixed + per_km * distance_km
    duration_factor = 1.0
    if context.is_peak:
        cost *= 1.5
        duration_factor *= 1.2
    if context.is_raining:
        cost += 20
        if mode == "walk":
            duration_factor *= 1.3
    return round(cost, 2), duration_factor
