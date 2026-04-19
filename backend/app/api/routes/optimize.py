from fastapi import APIRouter

from app.schemas.optimize import OptimizeRequest, OptimizeResponse
from app.services.optimize_service import optimize

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_routes(payload: OptimizeRequest):
    weights = {
        "cost_weight": 0.35,
        "time_weight": 0.35,
        "transfer_weight": 0.20,
        "walk_weight": 0.10,
    }
    return await optimize(payload.model_dump(), weights)
