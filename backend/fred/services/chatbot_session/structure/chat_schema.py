from typing import Literal, Optional, List, Dict, Union
from datetime import datetime
from pydantic import BaseModel, Field

# --- Base Token Usage ---
class ChatTokenUsage(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int

# --- Source document info ---
class ChatSource(BaseModel):
    document_uid: str
    file_name: str
    title: str
    author: str
    content: str
    created: str
    type: str
    modified: str
    score: float

# --- Unified message structure ---
class ChatMessagePayload(BaseModel):
    id: str = Field(..., description="Unique ID for the message")
    type: Literal["human", "ai", "system", "tool"]
    sender: Literal["user", "assistant", "system"]
    content: str
    timestamp: str
    session_id: str
    rank: Optional[int] = None
    metadata: Optional[Dict[str, Union[str, int, float, dict, list]]] = Field(default_factory=dict)

    def with_metadata(
        self,
        model: Optional[str] = None,
        token_usage: Optional[ChatTokenUsage] = None,
        sources: Optional[List[ChatSource]] = None,
        **extra
    ) -> "ChatMessagePayload":
        if model:
            self.metadata["model"] = model
        if token_usage:
            self.metadata["token_usage"] = token_usage.model_dump()
        if sources:
            self.metadata["sources"] = [
                s if isinstance(s, dict) else s.model_dump() for s in sources
            ]
        self.metadata.update(extra)
        return self

# --- Session structure ---
class SessionSchema(BaseModel):
    id: str
    user_id: str
    title: str
    updated_at: datetime

class SessionWithFiles(SessionSchema):
    file_names: list[str] = []
    
# --- Event wrappers ---
class StreamEvent(BaseModel):
    type: Literal["stream"]
    message: ChatMessagePayload

class FinalEvent(BaseModel):
    type: Literal["final"]
    messages: List[ChatMessagePayload]
    session: SessionSchema

class ErrorEvent(BaseModel):
    type: Literal["error"]
    content: str

# --- Union for WebSocket response ---
ChatEvent = Union[StreamEvent, FinalEvent, ErrorEvent]

def clean_agent_metadata(raw: dict) -> dict:
    """Extract only the relevant and safe metadata fields for ChatMessagePayload."""
    cleaned = {}

    if model := raw.get("model_name"):
        cleaned["model"] = model

    if finish_reason := raw.get("finish_reason"):
        cleaned["finish_reason"] = finish_reason

    if usage := raw.get("token_usage"):
        cleaned["token_usage"] = {
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }

    if sources := raw.get("sources"):
        cleaned["sources"] = sources

    if fred := raw.get("fred"):
        cleaned["fred"] = fred

    if raw.get("thought") is not None:
        cleaned["thought"] = raw["thought"]

    return cleaned

