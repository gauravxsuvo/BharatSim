"""AI Assistant router – chat endpoint backed by assistant_service."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import assistant_service

router = APIRouter(tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: str
    context: dict | None = None


@router.post("/chat")
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await assistant_service.chat(
        db=db,
        message=request.message,
        context=request.context,
    )
    return result
