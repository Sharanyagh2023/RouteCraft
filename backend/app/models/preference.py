from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), unique=True, index=True)
    cost_weight: Mapped[float] = mapped_column(Float, default=0.35)
    time_weight: Mapped[float] = mapped_column(Float, default=0.35)
    transfer_weight: Mapped[float] = mapped_column(Float, default=0.20)
    walk_weight: Mapped[float] = mapped_column(Float, default=0.10)
