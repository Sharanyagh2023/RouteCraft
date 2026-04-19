import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session


async def current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    return x_user_id or f"guest-{uuid.uuid4().hex[:10]}"


DBSession = Depends(db_session)
CurrentUserId = Depends(current_user_id)
