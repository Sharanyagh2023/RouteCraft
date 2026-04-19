from sklearn.preprocessing import MinMaxScaler


def score_routes(routes: list[dict], weights: dict[str, float]) -> list[dict]:
    if not routes:
        return []
    matrix = [
        [
            route["total_cost_inr"],
            route["total_duration_min"],
            route["transfers"],
            route["walking_distance_km"],
        ]
        for route in routes
    ]
    scaler = MinMaxScaler()
    normalized = scaler.fit_transform(matrix)
    for idx, route in enumerate(routes):
        route["score"] = (
            normalized[idx][0] * weights["cost_weight"]
            + normalized[idx][1] * weights["time_weight"]
            + normalized[idx][2] * weights["transfer_weight"]
            + normalized[idx][3] * weights["walk_weight"]
        )
    return sorted(routes, key=lambda item: item["score"])
