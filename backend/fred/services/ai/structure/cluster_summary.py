"""
Module for extracting a summary of a cluster based on a condensed representation of its components.
"""

from typing import Optional

from langchain_core.prompts import PromptTemplate
from fred.application_context import get_model_for_service, get_model_for_service, get_structured_chain_for_service

from langfuse.callback import CallbackHandler
from pydantic import BaseModel, Field

from services.ai.structure.cluster_context import ClusterContext


class ClusterSummary(BaseModel):
    """
    Represents a summary of a cluster based on a condensed representation of its components.
    """

    cluster_summary: str = Field(
        default="None", description="The summary of the cluster"
    )

    def __str__(self) -> str:
        """
        Return a string representation of the cluster summary.

        Returns:
            str: A formatted string containing the cluster summary.
        """
        return self.cluster_summary.__str__()

    @classmethod
    def from_cluster_context(
        cls,
        cluster_context: ClusterContext,
        langfuse_handler: Optional[CallbackHandler] = None,
    ) -> "ClusterSummary":
        """
        Extract a summary of the cluster based on its context.

        Args:
            cluster_context (ClusterContext): The cluster context.
            langfuse_handler (Optional[CallbackHandler]): The LangFuse callback handler.
        """

        prompt = PromptTemplate(
            template=(
                "{cluster_context}\n\n"
                "You are an expert in Kubernetes.\n"
                "Your role is produce a medium like article about a cluster above.\n"
                "The audience of this article could be an administrator or a developer who "
                "wants to understand the key aspects of the cluster.\n"
                "It should aims to speed up the onboarding process of new team members, "
                "or to provide a high-level overview of the cluster to stakeholders.\n"
                "Here is a condensed representation of the cluster you have to write about:\n\n"
                "Your article should be provided in markdown format.\n"
                "Provide the article in a structured JSON format with the key: "
                "`cluster_summary`."
            ),
            input_variables=["cluster_context"],
        )

        structured_model = get_structured_chain_for_service("kubernetes", ClusterSummary)
        chain = prompt | structured_model

        invocation_args = {"cluster_context": cluster_context}

        if langfuse_handler is not None:
            return chain.invoke(
                invocation_args,
                config={"callbacks": [langfuse_handler]},
            )

        return chain.invoke(invocation_args)
