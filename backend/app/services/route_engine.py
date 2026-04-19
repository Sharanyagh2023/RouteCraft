import uuid

import httpx

def _fallback_direct(mode: str):
    base_points = [
        {"lat": 12.9091, "lng": 77.6476},
        {"lat": 12.9380, "lng": 77.6107},
        {"lat": 12.9716, "lng": 77.5946},
    ]
    return {
        "id": uuid.uuid4().hex[:10],
        "mode": mode,
        "distance_km": 12.5 if mode != "bike" else 11.9,
        "time_min": 42 if mode == "auto" else 37 if mode == "car" else 44,
        "points": base_points,
        "provider": "ONDC",
    }


async def _geocode_location(name: str) -> dict | None:
    params = {
        "format": "json",
        "q": name,
        "limit": 1,
    }
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": "RouteCraftAI/1.0"},
        )
        response.raise_for_status()
        payload = response.json()
        if not payload:
            return None
        first = payload[0]
        return {"lat": float(first["lat"]), "lng": float(first["lon"])}


async def fetch_direct_routes(
    source_name: str,
    destination_name: str,
    source_lat: float | None = None,
    source_lng: float | None = None,
    destination_lat: float | None = None,
    destination_lng: float | None = None,
) -> list[dict]:
    try:
        source = {"lat": source_lat, "lng": source_lng}
        destination = {"lat": destination_lat, "lng": destination_lng}
        if source["lat"] is None or source["lng"] is None:
            source = await _geocode_location(source_name)
        if destination["lat"] is None or destination["lng"] is None:
            destination = await _geocode_location(destination_name)
        if not source or not destination:
            raise ValueError("Missing coordinates")

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"https://router.project-osrm.org/route/v1/driving/"
                f"{source['lng']},{source['lat']};{destination['lng']},{destination['lat']}",
                params={"overview": "full", "geometries": "geojson", "alternatives": "false"},
            )
            response.raise_for_status()
            payload = response.json()
            route = payload.get("routes", [])[0]
            geometry = route.get("geometry", {}).get("coordinates", [])
            points = [{"lat": coordinate[1], "lng": coordinate[0]} for coordinate in geometry]
            distance_km = round(route.get("distance", 0) / 1000, 2)
            duration_min = round(route.get("duration", 0) / 60, 1)
            return [
                {
                    "id": uuid.uuid4().hex[:10],
                    "mode": "auto",
                    "distance_km": distance_km,
                    "time_min": duration_min,
                    "points": points,
                    "provider": "Namma Yatri",
                },
                {
                    "id": uuid.uuid4().hex[:10],
                    "mode": "car",
                    "distance_km": distance_km,
                    "time_min": max(1, round(duration_min * 0.92, 1)),
                    "points": points,
                    "provider": "Ola",
                },
                {
                    "id": uuid.uuid4().hex[:10],
                    "mode": "bike",
                    "distance_km": distance_km,
                    "time_min": max(1, round(duration_min * 0.86, 1)),
                    "points": points,
                    "provider": "Rapido",
                },
            ]
    except Exception:
        return [_fallback_direct("auto"), _fallback_direct("car"), _fallback_direct("bike")]
