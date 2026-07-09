"""Pydantic schemas for the AI assistant chat interface.

Defines request and response schemas for the conversational AI endpoint
that provides environmental analysis assistance.
"""

from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single chat message in the conversation.

    Attributes:
        role: Message role — one of user, assistant, or system.
        content: Text content of the message.
    """

    role: str = Field(
        ...,
        pattern=r"^(user|assistant|system)$",
        description="Message role",
    )
    content: str = Field(
        ..., min_length=1, description="Message content"
    )


class ChatRequest(BaseModel):
    """Request schema for the chat endpoint.

    Attributes:
        message: The user's message text.
        context: Optional context dict that can include simulation_id,
                 district_id, or other metadata to ground the response.
    """

    message: str = Field(
        ..., min_length=1, description="User message"
    )
    context: dict[str, Any] | None = Field(
        None,
        description=(
            "Optional context with simulation_id, district_id, etc."
        ),
    )


class ChatResponse(BaseModel):
    """Response schema for the chat endpoint.

    Attributes:
        message: The assistant's response text.
        sources: Optional list of data sources referenced in the response.
    """

    message: str = Field(..., description="Assistant response")
    sources: list[dict[str, Any]] = Field(
        default_factory=list, description="Data sources referenced"
    )
