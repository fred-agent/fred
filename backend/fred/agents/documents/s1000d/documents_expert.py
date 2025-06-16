# Copyright Thales 2025
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import logging
from datetime import datetime
from typing import List, Optional

from fred.flow import AgentFlow
from fred.agents.documents.s1000d.documents_expert_toolkit import s1000dDocumentsExpertToolkit
from fred.application_context import (get_agent_settings,
                                      get_mcp_client_for_agent,
                                      get_model_for_agent)
from fred.common.models.document_source import DocumentSource
from fred.services.chatbot_session.structure.chat_schema import ChatSource
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
from langgraph.constants import START
from langgraph.graph import MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

logger = logging.getLogger(__name__)

class s1000dDocumentsExpert(AgentFlow):
    """
    An expert agent that searches and analyzes documents to answer user questions.
    This agent uses a vector search service to find relevant documents and generates
    responses based on the document content.
    """
    name: str = "s1000dDocumentsExpert"
    role: str = "S1000D Documents Expert"
    nickname: str = "Sidonie"
    description: str = (
        """
        An expert agent that searches and analyzes S1000D formatted documents to answer user questions.
        This agent uses a vector search service to find relevant documents and generates
        responses based on the document content.
        """)
    icon: str = "s1000d_documents_agent"
    categories: list[str] = []
    tag: str = "s1000d_documents"
    
    def __init__(self, cluster_fullname: Optional[str] = None):     
        """
        Initialize the s1000dDocumentsExpert agent with settings and configuration.
        Loads settings from agent configuration and sets up connections to the
        knowledge base service.
        """
        self.current_date = datetime.now().strftime("%Y-%m-%d")
        self.agent_settings = get_agent_settings(self.name)
        self.model = get_model_for_agent(self.name)
        self.mcp_client = get_mcp_client_for_agent(self.name)
        self.toolkit = s1000dDocumentsExpertToolkit(self.mcp_client)
        self.categories = self.agent_settings.categories if self.agent_settings.categories else ["s1000d"]
        if self.agent_settings.tag:
            self.tag = self.agent_settings.tag
        self.cluster_fullname=cluster_fullname

        super().__init__(
            name=self.name,
            role=self.role,
            nickname=self.nickname,
            description=self.description,
            icon=self.icon,
            graph=self.get_graph(),
            base_prompt=self._generate_prompt(),
            categories=self.categories,
            tag=self.tag,
            toolkit=self.toolkit
        )
    
    def _generate_prompt(self) -> str:
        """
        Generates the base prompt for the S1000D Document expert.
        
        Returns:
            str: The base prompt for the agent.
        """
        return (
            "You are a an agent responsible for analyzing document parts regarding the public figure Alizée and ask questions to the user with the extracted information.\n"
            "Whenever you reference a document part, provide citations. You are also equipped with MCP server tools. \n"
            "When opening a conversation you must be the one asking the questions before introducing yourself.\n"
            "### Your Primary Responsibilities:\n"
            "**Help user training**: Use the provided tools, including MCP server tools, to:\n"
            "   - Ask the user some questions regarding the information extracted from the document.\n"
            "   - Correct of validate the user answer providing, when available, the document source justifying the answer rightfulness.\n"
            "   - Keep in mind the questions the user answered badly to ask them back later in order to verify that the user has indeed well understood the correct answer.\n"
            "   - Leave the user one try per question to guess the correct answer. If he fails ,move on to the next question.\n"
            "**Retrieve Data**: Use the provided tools, including MCP server tools, to:\n"
            "   - Provide a summary of the file contents.\n"
            "   - Provide citations, quotes and awell formatted overview of the document contents.\n"
            "### Key Instructions:\n"
            "1. Always use tools to fetch data before providing answers. Avoid generating generic guidance or assumptions.\n"
            "2. Aggregate and analyze the data to directly answer the user's query.\n"
            "3. Present the results clearly, with summaries, breakdowns, and trends where applicable.\n\n"
            f"The current date is {self.current_date}.\n\n"
            f"Your current context involves a Kubernetes cluster named {self.cluster_fullname}.\n" if self.cluster_fullname else ""
        )
        
    def _greetings_prompt(self) -> str:
        return (
            "This is the first interaction that you have with the user so greet him/her and explain your purpose"
        )
    
    def _create_question_prompt(self) -> str:
        return (
            "Your goal is to ask the user a question based on document content retrieved using the vector search tool.\n"
            "You must first use the vector search tool with an appropriate query.\n"
            "Then, using the returned document content, formulate a single multiple-choice or open-ended question for the user.\n"
            "Do not generate questions without first using the tool."
        )

    
    async def reasoner(self, state: MessagesState):
        try:
            response = self.model.invoke([self.base_prompt] + state["messages"])
            for msg in state["messages"]:
                if isinstance(msg, ToolMessage):
                    try:
                        documents_data = json.loads(msg.content)
                    except Exception as e:
                        logger.error(f"Error parsing ToolMessage content: {e}")
                    try:
                        documents, sources = self.extract_sources_from_tool_response(documents_data)
                        # Check if we have any valid documents after processing
                        if not documents:
                            ai_message = await self.model.ainvoke([HumanMessage(content=
                                "I found some documents but couldn't process them correctly. Please try again later."
                            )])
                            return {"messages": [ai_message]}
                        response.response_metadata.update({"sources": [s.model_dump() for s in sources]})
                    except Exception as e:
                        logger.error(f"Error extracting sources from ToolMessage response: {e}")    
            return {"messages": [response]}    
        except Exception as e:
            # Handle any other unexpected errors
            print(f"Unexpected error in DocumentsExpert agent: {str(e)}")
            error_message = await self.model.ainvoke([HumanMessage(content=
                "An error occurred while processing your request. Please try again later."
            )])
            return {"messages": [error_message]}

    # # Called by AgentManager to start the conversation first
    # def start_autonomously(self):
    #     return self.invoke({"messages": []})

    def extract_sources_from_tool_response(self, documents_data):
        logger.info(f"Received response with {len(documents_data)} documents")
        
        # Process documents with error handling
        documents = []
        sources: List[ChatSource] = []
                
        for doc in documents_data:
            try:
                # Handle field name differences (uid vs document_uid)
                if "uid" in doc and "document_uid" not in doc:
                    doc["document_uid"] = doc["uid"]
                        
                        # Create DocumentSource instance
                doc_source = DocumentSource(**doc)
                documents.append(doc_source)
                        
                        # Create ChatSource for metadata
                source = ChatSource(
                            document_uid=getattr(doc_source, "document_uid", getattr(doc_source, "uid", "unknown")),
                            file_name=doc_source.file_name,
                            title=doc_source.title,
                            author=doc_source.author,
                            content=doc_source.content,
                            created=doc_source.created,
                            type=doc_source.type,
                            modified=doc_source.modified or "",
                            score=doc_source.score
                        )
                sources.append(source)
            except Exception as e:
                print(f"Error processing document: {str(e)}. Document: {doc}")
        return documents, sources
    
    async def generate_greetings(self, state: MessagesState):
        response = self.model.invoke([self.base_prompt] + [self._greetings_prompt()])
        return {"messages": [response]}
     
     
    async def create_question(self, state: MessagesState):
        messages = [self.base_prompt, self._create_question_prompt()]
        response = self.model.invoke(messages)
        if response.tool_calls:
            print(f"[DEBUG] Tool call detected: {response.tool_calls}")
        return {"messages": [response]}


    def get_graph(self):
        builder = StateGraph(MessagesState)

        builder.add_node("welcome_and_greet", self.generate_greetings)
        builder.add_node("create_question", self.create_question)
        builder.add_node("tools", ToolNode(self.toolkit.get_tools()))
        builder.add_node("reasoner", self.reasoner)

        builder.set_entry_point("welcome_and_greet")
        builder.add_edge("welcome_and_greet", "create_question")

        builder.add_conditional_edges("create_question", tools_condition)
        builder.add_edge("tools", "reasoner")

        builder.add_edge("create_question", "reasoner")

        builder.add_conditional_edges("reasoner", tools_condition)
        builder.add_edge("tools", "reasoner")
        builder.add_edge("reasoner", "create_question") 
        return builder
