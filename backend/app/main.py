from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.optimize import router as optimize_router
from app.api.routes.preferences import router as preferences_router
from app.api.routes.trips import router as trips_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.websocket.location import router as ws_router

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(optimize_router, prefix="/api", tags=["optimize"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(trips_router, prefix="/api", tags=["trips"])
app.include_router(preferences_router, prefix="/api", tags=["preferences"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])
