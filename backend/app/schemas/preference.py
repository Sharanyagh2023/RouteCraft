from pydantic import BaseModel


class PreferenceIn(BaseModel):
    cost_weight: float = 0.35
    time_weight: float = 0.35
    transfer_weight: float = 0.20
    walk_weight: float = 0.10
