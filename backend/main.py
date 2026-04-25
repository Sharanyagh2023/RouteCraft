from typing import Any, Dict, List, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from services.graph_engine import GraphBuilder, RouteEngine

app = FastAPI()

class Location(BaseModel):
    lat: float
    lon: float

class Leg(BaseModel):
    mode: Literal["walk", "auto", "bus", "metro"]
    from_location: Location
    to_location: Location
    duration: int  # in seconds
    distance: float # in meters

class RouteOption(BaseModel):
    legs: List[Leg]
    total_duration: int
    total_distance: float
    pivot_points: int

class RouteRequest(BaseModel):
    source: Location
    destination: Location
    max_pivot_points: int = 3


class CoordinatePoint(BaseModel):
    lat: float
    lng: float


class MultiModalRequest(BaseModel):
    origin: CoordinatePoint
    destination: CoordinatePoint


route_engine = RouteEngine(GraphBuilder.get_instance())


@app.get("/")
def home() -> Dict[str, str]:
    """Basic health endpoint so opening :8000 works in browser."""
    return {"message": "Backend running", "docs": "/docs"}

@app.post("/plan_route", response_model=List[RouteOption])
async def plan_route(request: RouteRequest):
    """
    This endpoint receives a source and destination, and returns a list of
    optimal multi-modal route options.
    """
    # This is a placeholder for the complex orchestration logic.
    # In a real implementation, this would call various provider APIs
    # (for metro, bus, auto) and a pathfinding algorithm to construct
    # the best routes.

    # Mock response to demonstrate the structure.
    mock_route = RouteOption(
        legs=[
            Leg(
                mode="walk",
                from_location=request.source,
                to_location=Location(lat=request.source.lat + 0.001, lon=request.source.lon + 0.001),
                duration=120,
                distance=150
            ),
            Leg(
                mode="auto",
                from_location=Location(lat=request.source.lat + 0.001, lon=request.source.lon + 0.001),
                to_location=Location(lat=request.destination.lat - 0.001, lon=request.destination.lon - 0.001),
                duration=600,
                distance=5000
            ),
            Leg(
                mode="walk",
                from_location=Location(lat=request.destination.lat - 0.001, lon=request.destination.lon - 0.001),
                to_location=request.destination,
                duration=120,
                distance=150
            )
        ],
        total_duration=840,
        total_distance=5300,
        pivot_points=1
    )
    return [mock_route]


def _validate_coordinates(point: CoordinatePoint) -> None:
    if not (-90.0 <= point.lat <= 90.0 and -180.0 <= point.lng <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid coordinates")


@app.get("/api/debug/graph")
def debug_graph() -> Dict[str, int]:
    """Temporary debug endpoint for graph node/edge counts."""
    graph = route_engine.graph
    return {"nodes": graph.number_of_nodes(), "edges": graph.number_of_edges()}


@app.post("/api/calculate-multi-modal")
def calculate_multi_modal(request: MultiModalRequest) -> Dict[str, Any]:
    _validate_coordinates(request.origin)
    _validate_coordinates(request.destination)

    result = route_engine.calculate_routes(
        origin_lat=request.origin.lat,
        origin_lng=request.origin.lng,
        destination_lat=request.destination.lat,
        destination_lng=request.destination.lng,
    )
    return result
