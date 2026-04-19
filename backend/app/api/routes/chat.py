from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import parse_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    parsed = await parse_chat(payload.message)
    return {
        **parsed,
        "response": "I updated your route request. You can now search with these values.",
    }
