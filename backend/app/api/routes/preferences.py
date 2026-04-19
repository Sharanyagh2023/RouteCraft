from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user_id, db_session
from app.models.preference import Preference
from app.schemas.preference import PreferenceIn

router = APIRouter()


@router.put("/preferences")
async def upsert_preferences(
    payload: PreferenceIn,
    db: AsyncSession = Depends(db_session),
    user_id: str = Depends(current_user_id),
):
    existing = await db.scalar(select(Preference).where(Preference.user_id == user_id))
    if existing:
        existing.cost_weight = payload.cost_weight
        existing.time_weight = payload.time_weight
        existing.transfer_weight = payload.transfer_weight
        existing.walk_weight = payload.walk_weight
        record = existing
    else:
        record = Preference(user_id=user_id, **payload.model_dump())
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return payload.model_dump()
