from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=3)


class ChatResponse(BaseModel):
    source: str | None = None
    destination: str | None = None
    preference: str | None = None
    avoid_modes: list[str] = Field(default_factory=list)
    response: str
