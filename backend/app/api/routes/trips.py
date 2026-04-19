from sqlalchemy import select
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user_id, db_session
from app.models.trip import Trip

router = APIRouter()


@router.get("/trips")
async def list_trips(
    db: AsyncSession = Depends(db_session),
    user_id: str = Depends(current_user_id),
):
    rows = await db.execute(select(Trip).where(Trip.user_id == user_id).order_by(Trip.created_at.desc()))
    trips = rows.scalars().all()
    return [
        {
            "id": trip.id,
            "source": trip.source,
            "destination": trip.destination,
            "selected_route": trip.selected_route,
            "created_at": trip.created_at,
        }
        for trip in trips
    ]
