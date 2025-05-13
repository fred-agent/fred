from datetime import datetime
from typing import List

import requests
from langchain.docstore.document import Document
from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, MessagesState, StateGraph

from flow import AgentFlow
from fred.application_context import get_agent_settings, get_model_for_agent
from fred.common.models.document_source import DocumentSource
from services.chatbot_session.structure.chat_schema import ChatSource

class DocumentsExpert(AgentFlow):
    name: str = "DocumentsExpert"
    role: str = "Documents Expert"
    nickname: str = "Dominic"
    description: str = "Extracts and analyzes document content to answer questions."
    icon: str = "documents_agent"
    categories: List[str] = []
    tag: str = "Innovation"

    def __init__(self):
        self.agent_settings = get_agent_settings(self.name)
        self.knowledge_flow_url = self.agent_settings.settings.get(
            "knowledge_flow_url", "http://localhost:8111/knowledge/v1"
        )
        self.document_directory = self.agent_settings.settings.get("document_directory", "./resources/knowledge/imported")
        self.chunk_size = self.agent_settings.settings.get("chunk_size", 512)
        self.chunk_overlap = self.agent_settings.settings.get("chunk_overlap", 64)
        self.current_date = datetime.now().strftime("%Y-%m-%d")
        self.vector_store_retriever = None
        self.categories = self.agent_settings.categories if self.agent_settings.categories else ["Documentation"]
        if self.agent_settings.tag:
            self.tag = self.agent_settings.tag

        super().__init__(
            name=self.name,
            role=self.role,
            nickname=self.nickname,
            description=self.description,
            icon=self.icon,
            graph=self.get_graph(),
            base_prompt=self._generate_prompt(),
            categories=self.categories,
            tag=self.tag
        )

    def _generate_prompt(self) -> str:
        return (
            "You are responsible for analyzing document parts and answering questions based on them.\n"
            "Whenever you reference a document part, provide citations.\n"
            f"The current date is {self.current_date}.\n"
        )

    async def agent(self, state: MessagesState):
        model = get_model_for_agent(self.name)
        question: str = state["messages"][-1].content
        try:
            response = requests.post(
                f"{self.knowledge_flow_url}/vector/search",
                json={"query": question, "top_k": 10},
                timeout=10
            )
            response.raise_for_status()
        except requests.RequestException as e:
            return {"error": f"Failed to retrieve documents: {str(e)}"}

        documents = [DocumentSource(**doc) for doc in response.json()]

        documents_str = ""
        sources: List[ChatSource] = []

        for doc in documents:
            documents_str += (
                f"Source file: {doc.file_name}\n"
                f"Page: {doc.page}\n"
                f"Content: {doc.content}\n\n"
            )
            try:
                source = ChatSource(
                    file_name=doc.file_name,
                    title=doc.title,
                    author=doc.author,
                    content=doc.content,
                    created=doc.created,
                    type=doc.type,
                    modified=doc.modified or "",
                    score=doc.score
                )
                sources.append(source)
            except Exception as e:
                print(f"Skipping malformed document: {e}")

        prompt = (
            "You are an assistant that answers questions based on retrieved documents.\n"
            "Use the following related documents to generate your answer and cite sources.\n\n"
            f"{documents_str}\n"
            f"Question:\n{question}\n\n"
        )

        response = await model.ainvoke([HumanMessage(content=prompt)])
        response.response_metadata.update({"sources": [s.model_dump() for s in sources]})
        return {"messages": [response]}

    def get_graph(self) -> StateGraph:
        builder = StateGraph(MessagesState)
        builder.add_node("agent", self.agent)
        builder.add_edge(START, "agent")
        builder.add_edge("agent", END)
        return builder
