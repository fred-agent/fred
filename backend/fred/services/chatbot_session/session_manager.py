from datetime import datetime
import logging
import secrets
from typing import List, Tuple, Dict, Any, Optional, Union, Callable, Awaitable
from uuid import uuid4

from chatbot.agent_manager import AgentManager
from flow import AgentFlow
from services.chatbot_session.structure.chat_schema import ChatMessagePayload, ChatTokenUsage, SessionSchema, clean_agent_metadata
from services.chatbot_session.abstract_session_backend import AbstractSessionStorage
from langchain_core.messages import (BaseMessage, HumanMessage, AIMessage)
from langgraph.graph.state import CompiledStateGraph
from fred.application_context import get_context_service

import asyncio

logger = logging.getLogger(__name__)

# Type for callback functions (synchronous or asynchronous)
CallbackType = Union[Callable[[Dict], None], Callable[[Dict], Awaitable[None]]]
_session_counter = 0


class SessionManager:
    """
    Manages user sessions and interactions with the chatbot.
    This class is responsible for creating, retrieving, and deleting sessions,
    as well as handling chat interactions.
    """ 
    def __init__(self, storage: AbstractSessionStorage, agent_manager: AgentManager = None):
        """
        Initializes the SessionManager with a storage backend and an optional agent manager.
        :param storage: An instance of AbstractSessionStorage for session management.
        :param agent_manager: An instance of AgentManager for managing agent instances.
        """
        self.storage = storage
        self.agent_manager = agent_manager
        self.context_service = get_context_service()
        self.context_cache = {}  # Cache for agent contexts

    def _get_or_create_session(self, user_id: str, session_id: Optional[str]) -> Tuple[SessionSchema, bool]:
        """
        Retrieves an existing session or creates a new one if not found.

        Args:
            user_id: The user ID.
            session_id: Optional session ID. If provided, will attempt to load it.

        Returns:
            A tuple of (SessionSchema, is_new_session)
        """
        if session_id:
            session = self.storage.get_session(session_id)
            if session:
                logger.info(f"Resumed existing session {session_id} for user {user_id}")
                return session, False

        new_session_id = secrets.token_urlsafe(8)
        title = f"{new_session_id}"
        session = SessionSchema(
            id=new_session_id,
            user_id=user_id,
            title=title,
            updated_at=datetime.now(),
        )
        self.storage.save_session(session)
        logger.warning(f"Created new session {new_session_id} for user {user_id}")
        return session, True

    async def chat_ask_websocket(
        self,
        callback: CallbackType,
        user_id: str,
        session_id: str,
        message: str,
        agent_name: str
    ) -> Tuple[SessionSchema, List[ChatMessagePayload]]:
        """
        Handles a chat request via WebSocket.
        This method prepares the session and message history, calls the agent,
        and streams the responses.
        :param callback: The callback to invoke for streaming responses.
        :param user_id: The ID of the user.
        :param session_id: The ID of the session.
        :param message: The message from the user.
        :param agent_name: The name of the agent to be used.
        :return: A tuple of (session, interaction).
        """
        logger.info(f"chat_ask_websocket called with user_id: {user_id}, session_id: {session_id}, message: {message}, agent_name: {agent_name}")
        # Step 1: Prepare session and history
        session, history, agent, is_new_session = self._prepare_session_and_history(
            user_id=user_id,
            session_id=session_id,
            message=message,
            agent_name=agent_name
        )
        assistant_id = str(uuid4())
        final_ai_msg = await self._stream_agent_response(
            compiled_graph=agent.get_compiled_graph(),
            input_messages=history,
            session_id=session.id,
            callback=callback,
            assistant_id=assistant_id,
        )
        # Update session
        session.updated_at = datetime.now()
        self.storage.save_session(session)
           # Generate ChatMessagePayloads
        timestamp = datetime.now().isoformat()
        rank = (len(history) - 1) // 2  # based on history before the new answer

        user_payload = ChatMessagePayload(
            id=assistant_id,
            type="human",
            sender="user",
            content=message,
            timestamp=timestamp,
            session_id=session.id,
            rank=rank,
        )           

        ai_payload = ChatMessagePayload(
            id=assistant_id,
            type="ai",
            sender="assistant",
            content=final_ai_msg.content,
            timestamp=timestamp,
            session_id=session.id,
            rank=rank,
        ).with_metadata(
            model=final_ai_msg.response_metadata.get("model_name"),
            sources=final_ai_msg.response_metadata.get("sources", []),
            token_usage=ChatTokenUsage(input_tokens=0, output_tokens=0, total_tokens=0),
        )
        # Save messages to storage
        self.storage.save_messages(session.id, [user_payload])
        self.storage.save_messages(session.id, [ai_payload])
        return session, [user_payload, ai_payload]

    def _prepare_session_and_history(
        self, user_id: str, session_id: str | None, message: str, agent_name: str
    ) -> Tuple[SessionSchema, List[BaseMessage], AgentFlow, bool]:
        """
        Prepares the session, message history, and agent instance.
        The agent is determined by the agent_name parameter.
        If session_id is None, a new session is created.
        Args:
            - user_id: the ID of the user
            - session_id: the ID of the session (None if a new session should be created)
            - message: the message from the user
            - agent_name: the name of the agent to be used

        Returns:
            - session: the resolved or created session
            - history: the list of BaseMessage to feed to the agent
            - agent: the LangGraph agent instance
            - is_new_session: whether this session was newly created
        """
       
        session, is_new_session = self._get_or_create_session(user_id, session_id)

        # Build up message history
        history: List[BaseMessage] = []
        if not is_new_session:
            messages = self.get_session_history(session.id)

            for msg in messages:
                if msg.type == "human":
                    history.append(HumanMessage(content=msg.content))
                elif msg.type == "ai":
                        history.append(AIMessage(content=msg.content, response_metadata=msg.metadata or {}))
                elif msg.type == "system":
                    #history.append(SystemMessage(content=msg.content))
                    pass


        # Append the new question
        history.append(HumanMessage(message))

        agent = self.agent_manager.get_create_agent_instance(agent_name, session.id)

        return session, history, agent, is_new_session

    def delete_session(self, session_id: str) -> bool:
        return self.storage.delete_session(session_id)

    def get_sessions(self, user_id: str) -> List[SessionSchema]:
        return self.storage.get_sessions_for_user(user_id)

    def get_session_history(self, session_id: str) -> List[ChatMessagePayload]:
        return self.storage.get_message_history(session_id)
    

    async def _stream_agent_response(
        self,
        compiled_graph: CompiledStateGraph,
        input_messages: List[BaseMessage],
        session_id: str,
        callback: CallbackType,
        assistant_id: str,
        config: Dict = None,
    ) -> AIMessage:
        """
        Executes the agentic flow and streams responses via the given callback.

        Args:
            compiled_graph: A compiled LangGraph graph.
            input_messages: List of Human/AI messages.
            session_id: Current session ID (used as thread ID).
            callback: A function that takes a `dict` and handles the streamed message.
            assistant_id:  ID for the assistant.
            config: Optional LangGraph config dict override.
            
        Returns:
            The final AIMessage.
        """
        last_ai_message: AIMessage | None = None
        config = config or {
            "configurable": {"thread_id": session_id},
            "recursion_limit": 40
        }

        try:
            async for event in compiled_graph.astream(
                {"messages": input_messages},
                config=config,
                stream_mode="updates"
            ):
                # LangGraph returns events like {'end': {'messages': [...]}} or {'next': {...}}
                key = next(iter(event))
                message_block = event[key].get("messages", [])
                for message in message_block:
                    if isinstance(message, AIMessage):
                        last_ai_message = message

                    enriched_dict = {
                        "id": assistant_id or str(uuid4()),
                        "type": message.type,
                        "sender": "assistant" if isinstance(message, AIMessage) else "system",
                        "content": message.content,
                        "timestamp": datetime.now().isoformat(),
                        "session_id": session_id,
                        "metadata": clean_agent_metadata(getattr(message, "response_metadata", {}) or {})
                    }
                    result = callback(enriched_dict)
                    if asyncio.iscoroutine(result):
                        await result

        except Exception as e:
            logger.exception(f"Error streaming agent response: {e}")
            raise e

        if last_ai_message is None:
            raise ValueError("No AIMessage returned from graph execution.")

        return last_ai_message

    def _get_agent_contexts(self, agent_name: str) -> List[Dict[str, Any]]:
        """
        Gets contexts for an agent using the existing context service.
        
        Args:
            agent_name: Name of the agent for which to retrieve contexts
            
        Returns:
            List of context dictionaries
        """
        # Check if the context is already in cache
        if agent_name in self.context_cache:
            logger.debug(f"Using cached contexts for agent '{agent_name}'")
            return self.context_cache[agent_name]
            
        try:
            # Retrieve contexts from the service
            contexts = self.context_service.get_contexts(agent_name)
            logger.info(f"Retrieved {len(contexts)} contexts for agent '{agent_name}'")
            
            # Cache it
            self.context_cache[agent_name] = contexts
            return contexts
                
        except Exception as e:
            logger.error(f"Error retrieving contexts for agent '{agent_name}': {e}")
            return []

    def refresh_context_for_agent(self, agent_name: str) -> bool:
        """
        Refreshes an agent's context by removing it from the cache.
        
        Args:
            agent_name: Name of the agent whose context to refresh
            
        Returns:
            True if the context was refreshed, False otherwise
        """
        if agent_name in self.context_cache:
            del self.context_cache[agent_name]
            logger.info(f"Context refreshed for agent '{agent_name}'")
            return True
        return False