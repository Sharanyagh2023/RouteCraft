import uuid


HUBS = [
    {"name": "Silk Board", "lat": 12.9176, "lng": 77.6224},
    {"name": "MG Road Metro", "lat": 12.9757, "lng": 77.6068},
]


def generate_combinations(source: str, destination: str, direct_routes: list[dict]) -> list[dict]:
    if not direct_routes:
        return []
    anchor = direct_routes[0]
    start = anchor["points"][0]
    end = anchor["points"][-1]
    hub = HUBS[0]
    metro_hub = HUBS[1]

    multimodal = {
        "id": uuid.uuid4().hex[:10],
        "type": "multi",
        "steps": [
            {"id": uuid.uuid4().hex[:8], "mode": "auto", "distance_km": 4.2, "time_min": 13, "lat": start["lat"], "lng": start["lng"], "provider": "Namma Yatri"},
            {"id": uuid.uuid4().hex[:8], "mode": "metro", "distance_km": 6.8, "time_min": 18, "lat": metro_hub["lat"], "lng": metro_hub["lng"], "provider": "BMRCL"},
            {"id": uuid.uuid4().hex[:8], "mode": "walk", "distance_km": 1.1, "time_min": 14, "lat": end["lat"], "lng": end["lng"], "provider": "Public"},
        ],
        "path": [start, hub, metro_hub, end],
    }
    split = {
        "id": uuid.uuid4().hex[:10],
        "type": "split",
        "steps": [
            {"id": uuid.uuid4().hex[:8], "mode": "bike", "distance_km": 5.7, "time_min": 15, "lat": start["lat"], "lng": start["lng"], "provider": "Rapido"},
            {"id": uuid.uuid4().hex[:8], "mode": "car", "distance_km": 7.5, "time_min": 17, "lat": hub["lat"], "lng": hub["lng"], "provider": "Ola"},
        ],
        "path": [start, hub, end],
    }
    return [multimodal, split]
