from context.store.context_storage_factory import get_context_store
import json
import uuid
from typing import Optional, Dict, Any
import os
from pathlib import Path

class ContextService:
    def __init__(self):
        self.store = get_context_store()

    def get_context(self, agent_id: str) -> Dict[str, Dict[str, Any]]:
        try:
            raw = self.store.get_context(agent_id)
            if raw is None:
                return {}
            return json.loads(raw)
        except Exception:
            return {}

    def add_context(self, agent_id: str, entry: Dict[str, Any]) -> Dict[str, Any]:
        context = self.get_context(agent_id)
        entry_id = entry.get("id") or str(uuid.uuid4())
        # remove id from inside the object to avoid duplication
        entry = {k: v for k, v in entry.items() if k != "id"}
        context[entry_id] = entry
        serialized = json.dumps(context, ensure_ascii=False, indent=2)
        self.store.set_context(agent_id, serialized)
        return {"id": entry_id, **entry}

    def delete_context_entry(self, agent_id: str, context_id: str) -> bool:
        context = self.get_context(agent_id)
        if context_id not in context:
            return False
        del context[context_id]
        self.store.set_context(agent_id, json.dumps(context, ensure_ascii=False, indent=2))
        return True

