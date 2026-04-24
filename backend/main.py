"""
FastAPI backend for multi-modal routing.

Endpoints:
    POST /get_route  -> Compute fastest, cheapest, optimal routes
    GET  /health     -> Service health check
    GET  /stops      -> List all available stops
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from models.graph_engine import get_graph

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RouteCraft Multi-Modal Router",
    description="Graph-based multi-modal routing engine (Bus + Metro + Walk)",
    version="1.0.0",
)

# CORS middleware (allow Node server on localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================== Request/Response Models ==============================

class RouteRequest(BaseModel):
    source: str
    destination: str


class Segment(BaseModel):
    mode: str
    from_stop: str
    to_stop: str
    time_min: float
    cost_inr: float
    distance_km: float

    class Config:
        populate_by_name = True


class RouteResult(BaseModel):
    id: str
    type: str
    modes: List[str]
    duration: float
    price: float
    distance_km: float
    transfers: int
    segments: List[Dict[str, Any]]
    path: List[str]


class RouteResponse(BaseModel):
    fastest: List[RouteResult]
    cheapest: List[RouteResult]
    optimal: List[RouteResult]


# ============================== API Endpoints ==============================

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "engine": "networkx-multi-modal"}


@app.get("/stops")
async def list_stops() -> Dict[str, Any]:
    """List all available stops in the network."""
    graph = get_graph()
    return {"stops": graph.get_stops(), "count": len(graph.get_stops())}


@app.post("/get_route", response_model=RouteResponse)
async def get_route(request: RouteRequest) -> Dict[str, List[Any]]:
    """
    Compute multi-modal routes between source and destination.

    Returns fastest, cheapest, and optimal strategies.
    """
    logger.info(f"Routing request: {request.source} -> {request.destination}")

    graph = get_graph()

    try:
        result = graph.get_tabs(request.source, request.destination)
        logger.info(
            f"Route found: fastest={result['fastest'][0]['duration']}min, "
            f"cheapest=₹{result['cheapest'][0]['price']}"
        )
        return result
    except ValueError as e:
        logger.warning(f"Routing error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected routing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal routing engine error")


# ============================== Entry Point ==============================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

