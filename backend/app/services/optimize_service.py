import hashlib
import json
import uuid
from datetime import datetime

from redis.asyncio import Redis

from app.core.config import settings
from app.services.combination_engine import generate_combinations
from app.services.decision_engine import score_routes
from app.services.fare_engine import FareContext, is_peak_hour, step_fare
from app.services.route_engine import fetch_direct_routes
from app.services.weather_service import is_raining


def _calc_route_totals(route: dict) -> dict:
    steps = route["steps"]
    return {
        "total_duration_min": round(sum(step["time_min"] for step in steps), 1),
        "total_cost_inr": round(sum(step["cost_inr"] for step in steps), 1),
        "transfers": max(0, len(steps) - 1),
        "walking_distance_km": round(sum(step["distance_km"] for step in steps if step["mode"] == "walk"), 2),
    }


async def optimize(payload: dict, weights: dict[str, float]) -> dict:
    redis = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    cache_key = "optimize:" + hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    source_name = payload["source"]["name"]
    destination_name = payload["destination"]["name"]
    source_lat = payload["source"].get("lat")
    source_lng = payload["source"].get("lng")
    destination_lat = payload["destination"].get("lat")
    destination_lng = payload["destination"].get("lng")
    direct = await fetch_direct_routes(
        source_name,
        destination_name,
        source_lat,
        source_lng,
        destination_lat,
        destination_lng,
    )
    combinations = generate_combinations(source_name, destination_name, direct)
    all_candidates = []

    rain = await is_raining(direct[0]["points"][0]["lat"], direct[0]["points"][0]["lng"])
    context = FareContext(is_peak=is_peak_hour(datetime.now()), is_raining=rain)

    for item in direct:
        distance = item["distance_km"]
        cost, factor = step_fare(item["mode"], distance, context)
        step = {
            "id": uuid.uuid4().hex[:8],
            "mode": item["mode"],
            "lat": item["points"][0]["lat"],
            "lng": item["points"][0]["lng"],
            "distance_km": round(distance, 2),
            "time_min": round(item["time_min"] * factor, 1),
            "cost_inr": cost,
            "provider": item["provider"],
        }
        route = {
            "id": item["id"],
            "type": "direct",
            "title": f"{item['mode'].upper()} via {item['provider']}",
            "steps": [step],
            "path": item["points"],
            "trip_id": uuid.uuid4().hex[:12],
        }
        route.update(_calc_route_totals(route))
        all_candidates.append(route)

    for combo in combinations:
        steps = []
        for raw_step in combo["steps"]:
            cost, factor = step_fare(raw_step["mode"], raw_step["distance_km"], context)
            steps.append(
                {
                    **raw_step,
                    "time_min": round(raw_step["time_min"] * factor, 1),
                    "cost_inr": cost,
                }
            )
        route = {
            "id": combo["id"],
            "type": combo["type"],
            "title": "Multi-Modal Split" if combo["type"] == "multi" else "Split Route",
            "steps": steps,
            "path": combo["path"],
            "trip_id": uuid.uuid4().hex[:12],
        }
        route.update(_calc_route_totals(route))
        all_candidates.append(route)

    scored = score_routes(all_candidates, weights)
    cheapest = min(scored, key=lambda item: item["total_cost_inr"])
    fastest = min(scored, key=lambda item: item["total_duration_min"])
    best = scored[0]
    result = {
        "plans": [
            {**cheapest, "type": "cheapest", "title": "Cheapest", "tags": ["eco-friendly", "budget"]},
            {**fastest, "type": "fastest", "title": "Fastest", "tags": ["optimized", "time-saver"]},
            {**best, "type": "best", "title": "Optimal", "tags": ["optimized", "balanced"]},
        ]
    }
    await redis.set(cache_key, json.dumps(result), ex=600)
    await redis.aclose()
    return result
