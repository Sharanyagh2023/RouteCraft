from pydantic import BaseModel, Field


class LocationPoint(BaseModel):
    name: str
    lat: float | None = None
    lng: float | None = None


class OptimizeRequest(BaseModel):
    source: LocationPoint
    destination: LocationPoint
    avoid_modes: list[str] = Field(default_factory=list)


class RouteStep(BaseModel):
    id: str
    mode: str
    lat: float
    lng: float
    distance_km: float
    time_min: float
    cost_inr: float
    provider: str | None = None


class RoutePlan(BaseModel):
    id: str
    type: str
    title: str
    total_duration_min: float
    total_cost_inr: float
    transfers: int
    walking_distance_km: float
    tags: list[str]
    steps: list[RouteStep]
    path: list[dict[str, float]]
    trip_id: str


class OptimizeResponse(BaseModel):
    plans: list[RoutePlan]
